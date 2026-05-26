import { useState } from "react";
import { signIn, signUp } from "../services/authService";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";

function AuthPage() {
  const { setUser, setProfile } = useAppContext();
  const { addToast } = useToast();
  
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      addToast("Username and password are required.", "error");
      return;
    }

    setLoading(true);

    try {
      let userData;
      if (isLogin) {
        userData = await signIn(username, password);
        addToast(`Welcome back, ${userData.username}!`, "success");
      } else {
        userData = await signUp(username, password);
        addToast(`Account created! Welcome, ${userData.username}!`, "success");
      }
      
      // Update global context
      setUser(userData);
      setProfile({ username: userData.username });
      
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container glass-panel">
        <h2>{isLogin ? "Welcome Back" : "Create Account"}</h2>
        <p className="auth-subtitle">
          {isLogin 
            ? "Log in to access your workspace." 
            : "Sign up to start organizing your digital life."}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label>Username</label>
            <input 
              type="text" 
              placeholder="Enter username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
            />
          </div>
          
          <div className="input-group">
            <label>Password</label>
            <div className="password-field">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Enter password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="auth-btn primary-btn" 
            disabled={loading}
          >
            {loading ? "Please wait..." : (isLogin ? "Log In" : "Sign Up")}
          </button>
        </form>

        <div className="auth-toggle">
          <p>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
              className="toggle-btn" 
              onClick={() => setIsLogin(!isLogin)}
              disabled={loading}
            >
              {isLogin ? "Sign Up" : "Log In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
