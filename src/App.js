// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store/store';
import PrivateRoute from './utils/PrivateRoute';
import Login from './components/Login/Login';
import Dashboard from './components/Dashboard/Dashboard';
import ConnectWa from './components/Dashboard/ConnectWa';
import MsgContact from './components/Dashboard/MsgContact';
import ContactList from './components/Dashboard/ContactList';
import BlastPage from './components/Dashboard/BlastPage';

const App = () => {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* <Route path="/signup" element={<Signup />} /> Create this component */}
          {/* <Route path="/forgot-password" element={<ForgotPassword />} /> Create this component */}
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/connect-wa" element={<ConnectWa />} />
            <Route path="/msg-contact" element={<MsgContact />} />
            <Route path="/contact-list" element={<ContactList />} />
            <Route path="/blast" element={<BlastPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </Provider>
  );
};

export default App;