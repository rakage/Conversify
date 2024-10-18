// src/components/Login/Login.js
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { setToken } from '../../store/authSlice';
import { login } from '../../services/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  useEffect(() => {
    // Check if the user is already authenticated
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { token } = await login({ username, password });
      localStorage.setItem('token', token);
      dispatch(setToken(token));
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  // If the user is already authenticated, don't render the login form
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f5f7fb]">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-center mb-6">
          <img src="https://placehold.co/40x40" alt="Conversify logo" className="h-10 w-10"/>
        </div>
        <h2 className="text-2xl font-bold text-center mb-2">Welcome to Conversify!<span role="img" aria-label="wave">👋</span></h2>
        <p className="text-center text-gray-600 mb-6">Please sign-in to your account and start the adventure</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700">Username</label>
            <input 
              type="text"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600" 
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="mb-4 relative">
            <label className="block text-gray-700">Password</label>
            <input 
              type={showPassword ? "text" : "password"} 
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600" 
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <i 
              className={`fas fa-eye${showPassword ? '-slash' : ''} absolute right-3 top-9 text-gray-500 cursor-pointer`}
              onClick={() => setShowPassword(!showPassword)}
            ></i>
          </div>
          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center">
              <input type="checkbox" className="form-checkbox"/>
              <span className="ml-2 text-gray-700">Remember me</span>
            </label>
            <Link to="/forgot-password" className="text-purple-600">Forgot password?</Link>
          </div>
          <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700">Log In</button>
        </form>
        <div className="text-center mt-6">
          <p className="text-gray-600">New on our platform? <Link to="/signup" className="text-purple-600">Create an account</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;