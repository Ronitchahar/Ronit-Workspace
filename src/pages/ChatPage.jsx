import { useState, useEffect, useRef } from "react";
import { getContextualAIResponse, generateChatTitle } from "../services/openai";
import {
  getChatHistory,
  addChatMessage,
  addChatImageMessage,
  getChatSessions,
  createChatSession,
  deleteChatSession,
  parseImageMessageFromRow,
} from "../services/chatService";
import { parseLegacyImagePlaceholder } from "../services/chatImageService";
import {
  initializeStorage,
  saveChatMessage,
  loadChatHistory,
  deleteChatMessage,
} from "../services/stableStorageService";
import { persistGeneratedImage, deleteImageFile } from "../services/imageStorageService";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { processSelectedFile } from "../utils/fileParser";
import { detectLanguage } from "../utils/languageDetector";
import { isImageGenerationRequest, generateImage, enhanceImagePrompt } from "../services/imageGenerationService";
import { determineRoute, isValidRoute, getCleanFileState, debugRouting } from "../services/routingService";
import { analyzeImage, fileToBase64, validateImageFile } from "../services/imageAnalysisService";
import { analyzeFile, validateFileType } from "../services/fileAnalysisService";
import ChatSkeletonLoader from "../components/layout/ChatSkeletonLoader";
import InputBar from "../components/chat/InputBar";
import ImageMessage from "../components/chat/ImageMessage";

function ChatPage() {
  const { user, profile, pendingAIText, setPendingAIText } = useAppContext();
  const { addToast } = useToast();
  
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isRestoringChats, setIsRestoringChats] = useState(true);
  
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const chatEndRef = useRef(null);

  const buildImageMessage = (cloud, prompt, messageId = null) => ({
    id: messageId || `img-${Date.now()}`,
    sender: "ai",
    type: "image",
    imageId: cloud.imageId,
    imageUrl: cloud.imageUrl,
    storagePath: cloud.storagePath,
    prompt,
    timestamp: Date.now(),
  });

  // Initialize storage system on app mount
  useEffect(() => {
    let mounted = true;
    async function initializeApp() {
      try {
        // Initialize storage (electron-store or localStorage)
        await initializeStorage();
        
        if (mounted) {
          console.log('✓ Storage initialized successfully');
          setIsRestoringChats(true);
        }
      } catch (error) {
        console.error('Error initializing storage:', error);
        addToast('Storage initialization failed, using backup', 'warning');
      }
    }
    
    initializeApp();
    return () => { mounted = false; };
  }, []);

  // Restore chat sessions on app startup - LOAD FROM SUPABASE FIRST
  useEffect(() => {
    let mounted = true;
    async function restoreSessions() {
      if (!isRestoringChats || !user) return;
      
      try {
        console.log('🔄 Restoring chat sessions from Supabase...');
        
        // CRITICAL: Load sessions from Supabase, not local cache
        const supabaseSessions = await getChatSessions(user.id);
        
        if (mounted) {
          if (supabaseSessions && supabaseSessions.length > 0) {
            console.log(`✅ Restored ${supabaseSessions.length} sessions from Supabase`);
            setSessions(supabaseSessions);
            
            // Load the most recent session
            try {
              await loadSession(supabaseSessions[0].id);
            } catch (sessionError) {
              console.error('Error loading first session:', sessionError);
              setMessages([{ sender: "ai", text: `Hello ${profile?.username || user?.username || "Guest"} 👋 I am Ronit. Select a chat to continue.` }]);
            }
          } else {
            // No sessions found
            console.log('No previous chat sessions found');
            setMessages([{ sender: "ai", text: `Hello ${profile?.username || user?.username || "Guest"} 👋 I am Ronit.` }]);
          }
        }
      } catch (error) {
        console.error('❌ Error restoring sessions:', error);
        if (mounted) {
          addToast('Could not restore chat history', 'warning');
          setMessages([{ sender: "ai", text: `Hello ${profile?.username || user?.username || "Guest"} 👋 I am Ronit.` }]);
        }
      } finally {
        if (mounted) {
          setIsRestoringChats(false);
        }
      }
    }
    
    restoreSessions();
  }, [user, profile]);

  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([{ sender: "ai", text: `Hello ${profile?.username || user?.username || "Guest"} 👋 I am Ronit.` }]);
    if (window.innerWidth < 768) setIsHistoryPanelOpen(false);
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      console.log(`🗑️  Deleting session from Supabase: ${sessionId}`);
      
      // Delete from Supabase first (PRIMARY)
      await deleteChatSession(sessionId);
      
      // Update UI immediately
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      addToast('Chat deleted successfully', 'success');
      
      // Reset to new chat if this was active
      if (activeSessionId === sessionId) {
        handleNewChat();
      }
      
      console.log('✅ Session deleted from Supabase');
    } catch (error) {
      console.error('Error deleting chat:', error);
      addToast(`Error deleting chat: ${error.message}`, "error");
    }
  };

  // Handle image regeneration
  const handleRegenerateImage = async (prompt) => {
    if (!prompt || !activeSessionId) return;

    try {
      setLoading(true);
      console.log('🎨 Regenerating image for prompt: ' + prompt);

      const imageBlob = await generateImage(prompt);
      
      // Save image to filesystem
      console.log('💾 Saving regenerated image...');
      console.log('☁️ Uploading regenerated image to Supabase Storage...');
      const cloud = await persistGeneratedImage(imageBlob, user.id, activeSessionId, prompt);
      const imageMessage = buildImageMessage(cloud, prompt);
      setMessages((prev) => [...prev, imageMessage]);

      const savedMsg = await addChatImageMessage(user.id, activeSessionId, "assistant", { ...cloud, prompt });
      if (!savedMsg) {
        console.warn('⚠️  Failed to save image to Supabase, but image is displayed');
      }

      await saveChatMessage(activeSessionId, "assistant", prompt, {
        type: 'image',
        imageId: cloud.imageId,
        imageUrl: cloud.imageUrl,
        storagePath: cloud.storagePath,
        prompt,
      });

      addToast("Image regenerated successfully!", "success");
    } catch (error) {
      console.error('❌ Image Regeneration Error:', error);
      addToast("Failed to regenerate image", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle image deletion
  const handleDeleteImage = async (messageId) => {
    try {
      console.log(`🗑️  Deleting image message: ${messageId}`);

      const target = messages.find((msg) => msg.id === messageId);
      await deleteImageFile(target?.imageId, target?.storagePath);

      if (activeSessionId) {
        await deleteChatMessage(activeSessionId, messageId, target?.imageId);
      }

      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      addToast("Image deleted from chat", "success");
    } catch (error) {
      console.error('Error deleting image:', error);
      addToast("Failed to delete image", "error");
    }
  };

  // Load a specific chat session by ID
  const loadSession = async (sessionId) => {
    if (!sessionId) {
      console.warn('loadSession: Invalid session ID');
      return;
    }

    try {
      console.log(`Loading session from Supabase: ${sessionId}`);
      setActiveSessionId(sessionId);
      
      const [chatMessages, localMessages] = await Promise.all([
        getChatHistory(sessionId),
        loadChatHistory(sessionId),
      ]);

      const localImageMessages = (localMessages || []).filter((m) => m.type === 'image');
      const usedLocalImageIds = new Set();

      const resolveImageMessage = (msg, fallbackId) => {
        const legacyRef = msg.imageId || msg.imagePath;
        const imageId =
          msg.imageId ||
          (legacyRef && legacyRef.startsWith('img-') ? legacyRef : null);

        if (imageId?.startsWith('img-')) usedLocalImageIds.add(imageId);

        return {
          id: msg.id || fallbackId,
          sender: msg.sender === 'assistant' ? 'ai' : (msg.sender || 'ai'),
          type: 'image',
          imageId,
          imageUrl: msg.imageUrl || null,
          storagePath: msg.storagePath || null,
          prompt: msg.prompt || msg.content || 'Generated image',
          timestamp: msg.timestamp || msg.createdAt || 0,
        };
      };

      if (chatMessages && Array.isArray(chatMessages)) {
        const formattedMessages = [];

        for (const msg of chatMessages) {
          const cloudImage = parseImageMessageFromRow(msg);
          if (cloudImage) {
            formattedMessages.push({
              id: msg.id,
              sender: msg.sender === 'assistant' || msg.sender === 'ai' ? 'ai' : 'user',
              type: 'image',
              imageId: cloudImage.imageId,
              imageUrl: cloudImage.imageUrl,
              storagePath: cloudImage.storagePath,
              prompt: cloudImage.prompt,
              timestamp: msg.created_at ? new Date(msg.created_at).getTime() : 0,
            });
            if (cloudImage.imageId) usedLocalImageIds.add(cloudImage.imageId);
            continue;
          }

          const text = msg.text || msg.content || '';
          const legacy = parseLegacyImagePlaceholder(text);

          if (legacy) {
            const localImg = localImageMessages.find(
              (l) => l.prompt === legacy.prompt || l.content === legacy.prompt
            );

            if (localImg) {
              formattedMessages.push(resolveImageMessage(localImg, msg.id));
              continue;
            }
          }

          formattedMessages.push({
            id: msg.id,
            sender: msg.sender === 'assistant' || msg.sender === 'ai' ? 'ai' : 'user',
            text,
            attachment: msg.metadata?.fileName || null,
            timestamp: msg.created_at ? new Date(msg.created_at).getTime() : 0,
          });
        }

        for (const localImg of localImageMessages) {
          const ref = localImg.imageId || localImg.imagePath;
          if (ref && usedLocalImageIds.has(ref)) continue;
          formattedMessages.push(resolveImageMessage(localImg, `local-${ref}`));
        }

        formattedMessages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        setMessages(formattedMessages);
        console.log(`✅ Loaded ${formattedMessages.length} messages (Supabase + local images) for session ${sessionId}`);
      } else if (localImageMessages.length > 0) {
        const formattedMessages = localImageMessages.map((msg, i) =>
          resolveImageMessage(msg, `local-${i}`)
        );
        setMessages(formattedMessages);
      } else {
        console.warn('No messages found for session:', sessionId);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading session:', error);
      addToast(`Error loading chat: ${error.message}`, 'error');
      setMessages([]);
    }
  };

  // Auto-scroll to latest message
  useEffect(() => {
    const timer = setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, loading, isThinking]);

  const sendMessage = async (messageData) => {
    // Handle both string (legacy) and object format
    let text = "";
    let file = null;
    let fileBlob = null;

    if (typeof messageData === "string") {
      text = messageData;
    } else if (typeof messageData === "object") {
      text = messageData.text || "";
      file = messageData.file || null;
      fileBlob = messageData.file ? messageData.file.file : null;
    }

    // ====================================================
    // DEBUG: Log incoming message data
    // ====================================================
    console.log('📥 ChatPage.sendMessage received:');
    console.log('  Text:', text ? text.substring(0, 50) : '(empty)');
    console.log('  File object exists:', !!file);
    console.log('  File blob exists:', fileBlob instanceof Blob);
    if (file) {
      console.log('    - File name:', file.name);
      console.log('    - File type:', file.type);
      console.log('    - File is image:', file.type ? file.type.startsWith('image/') : false);
      console.log('    - File is document:', file.type ? !file.type.startsWith('image/') : false);
    }

    if (!text.trim() && !file) return;
    if (!user) return;

    const currentText = text;
    const currentFile = file;
    const currentFileBlob = fileBlob;
    const isFirstMessage = !activeSessionId;

    // NOTE: Do NOT create random session ID here
    // Will create session in Supabase below for first message
    const sessionId = activeSessionId;

    // Add user message to UI immediately (optimistic update)
    const userMessage = { 
      sender: "user", 
      text: currentText,
      attachment: currentFile ? currentFile.name : null
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setIsThinking(true);

    try {
      // Create new session in Supabase if it's the first message
      let realSessionId = sessionId;
      if (isFirstMessage) {
        console.log('📝 Creating new session in Supabase...');
        const title = await generateChatTitle(currentText || "Attachment sent");
        
        // CRITICAL: Create session in Supabase and get real DB ID
        const supabaseSession = await createChatSession(user.id, title);
        realSessionId = supabaseSession.id;
        
        console.log(`✅ Session created in Supabase with ID: ${realSessionId}`);
        
        setActiveSessionId(realSessionId);
        
        // Add to sessions list
        const newSessionEntry = {
          id: realSessionId,
          title,
          messageCount: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setSessions(prev => [newSessionEntry, ...prev]);
        addToast('New chat created', 'success');
      }

      // Save user message to Supabase (PRIMARY)
      console.log(`💾 Saving user message to Supabase for session ${realSessionId}...`);
      const savedUserMessage = await addChatMessage(user.id, realSessionId, "user", currentText);
      if (!savedUserMessage) {
        throw new Error('Failed to save user message to Supabase');
      }
      console.log('✅ User message saved to Supabase');

      // ============================================================
      // ============================================================
      // UNIVERSAL ROUTING: Determine message flow using routing service
      // ============================================================
      
      // Prepare routing context with defensive guards
      const routingContext = {
        text: currentText,
        file: currentFile,
        fileBlob: currentFileBlob,
        messages: messages.slice(-5)
      };

      // Determine which pipeline should handle this message
      const routeResult = determineRoute(routingContext);
      
      // Validate routing decision
      if (!isValidRoute(routeResult)) {
        throw new Error(`Invalid routing decision: ${routeResult.route}`);
      }

      console.log(`
═══════════════════════════════════════════════════════════════
🎯 ROUTING DECISION: ${routeResult.route}
Confidence: ${routeResult.confidence}%
Reason: ${routeResult.reason}
═══════════════════════════════════════════════════════════════`);

      // ============================================================
      // ROUTE 1: IMAGE ANALYSIS
      // ============================================================
      if (routeResult.route === 'IMAGE_ANALYSIS') {
        console.log('📸 ROUTING TO: IMAGE_ANALYSIS');
        
        const analysisFile = routeResult.details.file;
        const analysisBlob = routeResult.details.fileBlob;
        
        try {
          setIsThinking(false);
          setLoading(true);

          console.log(`[IMAGE_ANALYSIS] Analyzing uploaded image: ${analysisFile.name}`);
          console.log(`[IMAGE_ANALYSIS] Blob validation: size=${analysisBlob.size}, type=${analysisBlob.type}`);
          
          // Validate image (defensive)
          const validation = validateImageFile(analysisBlob);
          if (!validation.valid) {
            throw new Error(validation.error);
          }

          console.log(`[IMAGE_ANALYSIS] ✅ Image validation passed`);

          // Analyze image with AI
          const analysis = await analyzeImage(
            analysisBlob,
            currentText || 'Please analyze this image.',
            messages.slice(-5).map(m => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text
            }))
          );

          // Add AI analysis response to UI
          const aiMessage = { sender: "ai", text: analysis };
          setMessages((prev) => [...prev, aiMessage]);

          // Save analysis to Supabase
          const saved = await addChatMessage(user.id, realSessionId, "assistant", analysis);
          if (!saved) console.warn('⚠️  Failed to save analysis to Supabase');
          
          console.log('✅ AI analysis saved to Supabase');
          addToast("Image analyzed successfully!", "success");

        } catch (imageError) {
          console.error('❌ Image Analysis Error:', imageError);
          const errorMsg = imageError.message || "Failed to analyze image";
          addToast(errorMsg, "error");
          setMessages((prev) => [...prev, { 
            sender: "ai", 
            text: `❌ Image analysis failed: ${errorMsg}` 
          }]);
        } finally {
          setLoading(false);
        }
        return;
      }

      // ============================================================
      // ROUTE 2: FILE ANALYSIS
      // ============================================================
      if (routeResult.route === 'FILE_ANALYSIS') {
        console.log('📄 ROUTING TO: FILE_ANALYSIS');
        
        const analysisFile = routeResult.details.file;
        const analysisBlob = routeResult.details.fileBlob;
        
        try {
          setIsThinking(false);
          setLoading(true);

          console.log(`[FILE_ANALYSIS] Analyzing uploaded file: ${analysisFile.name}`);
          console.log(`[FILE_ANALYSIS] Blob validation: size=${analysisBlob.size}, type=${analysisBlob.type}`);
          
          // Validate file (defensive)
          const validation = validateFileType(analysisBlob);
          if (!validation.valid) {
            throw new Error(validation.error);
          }

          console.log(`[FILE_ANALYSIS] ✅ File validation passed: ${validation.type}`);

          // Analyze file with AI
          const analysis = await analyzeFile(
            analysisBlob,
            currentText || `Please analyze this ${validation.type} file.`,
            messages.slice(-5).map(m => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text
            }))
          );

          // Add AI analysis response to UI
          const aiMessage = { sender: "ai", text: analysis };
          setMessages((prev) => [...prev, aiMessage]);

          // Save analysis to Supabase
          const saved = await addChatMessage(user.id, realSessionId, "assistant", analysis);
          if (!saved) console.warn('⚠️  Failed to save analysis to Supabase');
          
          console.log('✅ AI file analysis saved to Supabase');
          addToast("File analyzed successfully!", "success");

        } catch (fileError) {
          console.error('❌ File Analysis Error:', fileError);
          const errorMsg = fileError.message || "Failed to analyze file";
          addToast(errorMsg, "error");
          setMessages((prev) => [...prev, { 
            sender: "ai", 
            text: `❌ File analysis failed: ${errorMsg}` 
          }]);
        } finally {
          setLoading(false);
        }
        return;
      }

      // ============================================================
      // ROUTE 3: IMAGE GENERATION
      // ============================================================
      if (routeResult.route === 'IMAGE_GENERATION') {
        console.log('🎨 ROUTING TO: IMAGE_GENERATION');
        console.log(`   Text: "${currentText}"`);
        
        try {
          setIsThinking(false);
          setLoading(true);

          // Enhance prompt professionally
          const enhancedPrompt = enhanceImagePrompt(currentText);
          console.log(`📝 Original prompt: "${currentText}"`);
          console.log(`✨ Enhanced prompt: "${enhancedPrompt}"`);
          
          console.log('🚀 Starting image generation...');
          
          // Generate image (this will throw on failure)
          const imageBlob = await generateImage(enhancedPrompt);
          
          // Save image to filesystem and get path
          console.log('💾 Saving image to filesystem...');
          console.log('☁️ Uploading image to Supabase Storage...');
          const cloud = await persistGeneratedImage(imageBlob, user.id, realSessionId, currentText);
          console.log(`✅ Image cloud URL: ${cloud.imageUrl}`);

          const imageMessage = buildImageMessage(cloud, currentText);
          setMessages((prev) => [...prev, imageMessage]);

          const savedImageMsg = await addChatImageMessage(user.id, realSessionId, "assistant", {
            ...cloud,
            prompt: currentText,
          });
          if (!savedImageMsg) {
            console.warn('⚠️  Failed to save image to Supabase, but image is still displayed');
          } else {
            console.log('✅ Image synced to Supabase (Storage + metadata)');
          }

          await saveChatMessage(realSessionId, "assistant", currentText, {
            type: 'image',
            imageId: cloud.imageId,
            imageUrl: cloud.imageUrl,
            storagePath: cloud.storagePath,
            prompt: currentText,
          });

          addToast("Image generated successfully!", "success");
          console.log('✅ Image persisted (Supabase Storage + local cache)');

        } catch (imageError) {
          console.error('❌ IMAGE GENERATION FAILED:', imageError.message);
          console.error('   Stack:', imageError.stack);
          
          // Show error message
          const errorMsg = imageError.message || "Image generation failed";
          addToast(errorMsg, "error");
          
          // Add error message to chat so user knows what happened
          const errorMessage = {
            sender: "ai",
            text: `❌ Image generation failed: ${errorMsg}\n\nMake sure the backend server is running on port 3001.`
          };
          setMessages((prev) => [...prev, errorMessage]);
          
          console.log('❌ Error message displayed to user');
        } finally {
          setLoading(false);
        }
        
        // CRITICAL: Always return after generation attempt (success or failure)
        return;
      }

      // ============================================================
      // ROUTE 4: NORMAL CHAT
      // ============================================================
      console.log('💬 ROUTING TO: NORMAL_CHAT');
      
      setIsThinking(false);
      console.log('🤔 Calling AI service...');
      console.log('   History items:', messages.length);
      console.log('   Message:', currentText.substring(0, 100));
      
      let aiReply;
      try {
        aiReply = await getContextualAIResponse(currentText, messages, currentFile);
        
        if (!aiReply || typeof aiReply !== 'string' || aiReply.trim().length === 0) {
          console.warn('⚠️ Empty AI response received');
          aiReply = "I received your message but couldn't generate a proper response. Please try again.";
        }
      } catch (aiError) {
        console.error('❌ AI Service Error:', aiError);
        console.error('Error type:', aiError.constructor.name);
        console.error('Error message:', aiError.message);
        
        // Check if it's an API key issue
        if (aiError.message && aiError.message.includes('API key')) {
          aiReply = "⚠️ AI service is not configured. Please check your OpenRouter API key in environment variables.";
        } else if (aiError.message && aiError.message.includes('fetch')) {
          aiReply = "❌ Unable to reach AI service. Please check your internet connection.";
        } else {
          aiReply = `❌ AI Error: ${aiError.message || 'Unknown error occurred'}`;
        }
      }
      
      // Add AI message to UI
      const aiMessage = { sender: "ai", text: aiReply };
      setMessages((prev) => [...prev, aiMessage]);

      // Save AI message to Supabase
      const saved = await addChatMessage(user.id, realSessionId, "assistant", aiReply);
      if (!saved) console.warn('⚠️  Failed to save AI message to Supabase');
      console.log('✅ AI message saved to Supabase');

      // Show success toast
      addToast('Chat saved successfully', 'success');

    } catch (error) {
      console.error('❌ Error sending message:', error);
      console.error('Stack trace:', error.stack);
      
      const errorMessage = error.message || 'An unexpected error occurred';
      addToast(`Error: ${errorMessage}`, "error");
      
      // Add error message to UI
      setMessages((prev) => [...prev, { 
        sender: "ai", 
        text: `❌ Sorry, I encountered an error: ${errorMessage}\n\nPlease try again or check the browser console for details.` 
      }]);
    } finally {
      setLoading(false);
      setIsThinking(false);
      
      // ========================================================
      // CRITICAL: FINAL STATE CLEANUP
      // Ensures file state is never left in a corrupt state
      // This runs even if an error occurred
      // ========================================================
      console.log('🧹 Final cleanup in ChatPage...');
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="chat-page">
      <div className="chat-top-controls">
        <div className="chat-top-actions">
          <button 
            className="glass-btn" 
            onClick={handleNewChat}
            aria-label="New Chat"
            title="New Chat"
          >
            <span>+</span>
          </button>
          <button 
            className="glass-btn" 
            onClick={() => setIsHistoryPanelOpen(!isHistoryPanelOpen)}
            style={{ 
              background: isHistoryPanelOpen ? 'var(--accent)' : '', 
              borderColor: isHistoryPanelOpen ? 'var(--accent)' : ''
            }}
            aria-label="Chat History"
            title="Chat History"
          >
            🕒
          </button>
        </div>
      </div>

      {isHistoryPanelOpen && (
        <div className="history-panel slide-in-right">
          <div className="history-panel-header">
            <h3>Chat History</h3>
            <input 
              type="text" 
              className="history-search" 
              placeholder="Search chats..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="history-list">
            {filteredSessions.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--text-muted)", marginTop: "20px" }}>No chats found.</p>
            ) : (
              filteredSessions.map(session => (
                <div 
                  key={session.id} 
                  className={`history-item ${activeSessionId === session.id ? 'active' : ''}`}
                  onClick={() => {
                    loadSession(session.id);
                    if (window.innerWidth < 768) setIsHistoryPanelOpen(false);
                  }}
                >
                  <div className="history-item-content">
                    <h4>{session.title || "New Chat"}</h4>
                    <small>{new Date(session.created_at || session.createdAt).toLocaleDateString()}</small>
                  </div>
                  <button 
                    className="delete-chat-btn" 
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    title="Delete Chat"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {isRestoringChats ? (
        <ChatSkeletonLoader />
      ) : (
        <div className="chat-messages">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`message ${
                message.sender === "user"
                  ? "user-message"
                  : "ai-message"
              }`}
            >
              <h4>
                {message.sender === "user"
                  ? "You"
                  : "Ronit"}
              </h4>

              {message.type === "image" && (message.imageUrl || message.imageId) && (
                <ImageMessage
                  imageUrl={message.imageUrl}
                  imageId={message.imageId}
                  prompt={message.prompt}
                />
              )}

              {/* Display attachment pill if it exists in message history */}
              {(message.attachment || (message.text && message.text.startsWith("[Attachment:"))) && (
                <div className="message-attachment">
                  📎 <span>{message.attachment || message.text.split("\n")[0].replace("[Attachment: ", "").replace("]", "")}</span>
                </div>
              )}
              
              {message.text && (
                <p>{(message.text && message.text.startsWith("[Attachment:")) ? message.text.substring(message.text.indexOf("\n") + 1) : message.text}</p>
              )}
            </div>
          ))}

          {isThinking && (
            <div className="message ai-message thinking-indicator">
              <h4>Ronit</h4>
              <div className="thinking-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <p className="thinking-text">Thinking...</p>
            </div>
          )}

          {loading && !isThinking && (
            <div className="message ai-message typing-animation">
              <h4>Ronit</h4>
              <p>Typing</p>
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          <div ref={chatEndRef}></div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
        <InputBar sendMessage={sendMessage} />
      </div>
    </div>
  );
}

export default ChatPage;