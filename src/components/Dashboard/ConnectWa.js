import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faSpinner, faCheckCircle, faTachometerAlt, faChartLine, faChartPie, faShoppingCart, faGraduationCap, faTruck, faFileAlt, faEnvelope, faComments, faCalendarAlt, faColumns, faCog, faLock, faEllipsisH, faCreditCard, faUsers, faBox, faDollarSign } from '@fortawesome/free-solid-svg-icons';
import Sidebar from '../Layout/Sidebar';
import ProfileDropdown from '../Layout/ProfileDropdown';
import { jwtDecode } from "jwt-decode";


const ConnectWa = () => {
    const [qrCode, setQrCode] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('checking');
    const [error, setError] = useState('');
    const [showConnectButton, setShowConnectButton] = useState(false);
    const [billingCycle, setBillingCycle] = React.useState('monthly');
    const token = useSelector(state => state.auth.token);
    const decodedToken = jwtDecode(token);
    const pricingData = {
      monthly: [
          { title: "Basic plan", price: "$10/mth", description: "Ideal for small teams and startups.", features: ["Access to all basic features", "Basic reporting and analytics", "Up to 10 individual users", "20GB individual data each user", "Basic chat and email support"] },
          { title: "Business plan", price: "$20/mth", description: "Growing teams up to 20 users.", features: ["200+ integrations", "Advanced reporting and analytics", "Up to 20 individual users", "40GB individual data each user", "Priority chat and email support"], popular: true },
          { title: "Enterprise plan", price: "$40/mth", description: "Large teams with unlimited users.", features: ["Advanced custom fields", "Audit log and data history", "Unlimited individual users", "Unlimited individual data", "Personalised+priority service"] }
      ],
      annual: [
          { title: "Basic plan", price: "$100/yr", description: "Ideal for small teams and startups.", features: ["Access to all basic features", "Basic reporting and analytics", "Up to 10 individual users", "20GB individual data each user", "Basic chat and email support"] },
          { title: "Business plan", price: "$200/yr", description: "Growing teams up to 20 users.", features: ["200+ integrations", "Advanced reporting and analytics", "Up to 20 individual users", "40GB individual data each user", "Priority chat and email support"], popular: true },
          { title: "Enterprise plan", price: "$400/yr", description: "Large teams with unlimited users.", features: ["Advanced custom fields", "Audit log and data history", "Unlimited individual users", "Unlimited individual data", "Personalised+priority service"] }
      ]
  };
  
    const axiosInstance = axios.create({
      baseURL: 'http://localhost:3000',
      headers: { Authorization: `Bearer ${token}` }
    });
  
    const fetchQrCode = async () => {
      try {
        const response = await axiosInstance.get('/whatsapp/connect');
        setQrCode(response.data.qrCodeImage);
        setConnectionStatus('pending');
      } catch (err) {
        setError('Failed to fetch QR code. Please try again.');
        console.error('Error fetching QR code:', err);
      }
    };
  
    const checkConnectionStatus = async () => {
      try {
        const response = await axiosInstance.get('/whatsapp/status');
        console.log('Connection status:', response.data.status);
        setConnectionStatus(response.data.status);
        return response.data.status;
      } catch (err) {
        setError('Failed to check connection status. Please try again.');
        setConnectionStatus('error');
        console.error('Error checking connection status:', err);
        return 'error';
      }
    };
  
    useEffect(() => {
      let statusCheckCount = 0;
      const maxStatusChecks = 10; // 10 seconds
      
      if (decodedToken.plan === 'free') {
        return;
      }

      const checkStatus = async () => {
        const status = await checkConnectionStatus();
        if (status === 'ready') {
          clearInterval(statusInterval);
        } else if (statusCheckCount >= maxStatusChecks) {
          clearInterval(statusInterval);
          setShowConnectButton(true);
        }
        {}
      };
  
      const statusInterval = setInterval(checkStatus, 1000);
  
      return () => clearInterval(statusInterval);
    }, []);
  
    const handleConnect = () => {
      fetchQrCode();
      setShowConnectButton(false);
    };

    const PricingCard = ({ title, price, description, features, popular }) => (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${popular ? 'border-2 border-purple-500' : ''}`}>
          {popular && <div className="text-center text-purple-500 font-semibold mb-2">Most popular plan</div>}
          <div className="text-center text-3xl font-bold mb-2">{price}</div>
          <div className="text-center text-lg font-semibold mb-4">{title}</div>
          <div className="text-center text-gray-500 mb-6">{description}</div>
          <ul className="mb-6">
              {features.map((feature, index) => (
                  <li key={index} className="flex items-center mb-2">
                      <i className="fas fa-check-circle text-green-500 mr-2"></i>
                      <span>{feature}</span>
                  </li>
              ))}
          </ul>
          <button className="w-full bg-purple-500 text-white py-2 rounded-lg font-semibold">Get started</button>
      </div>
    );
  
  
    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
    
        {/* Check if the plan is 'free' */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-700">
              {decodedToken.plan === 'free' ? 'Choose Your Package' : 'Connect WhatsApp'}
            </h1>
            <ProfileDropdown />
          </div>
    
          <div className="bg-white p-6 rounded-lg shadow">
            {decodedToken.plan === 'free' ? (
              // Render package options if the plan is 'free'
              <div className="text-center mb-8">
                <div className="inline-flex bg-gray-100 rounded-lg p-1 mb-8">
                    <button onClick={() => setBillingCycle('monthly')} className={`px-4 py-2 rounded-lg shadow ${billingCycle === 'monthly' ? 'bg-white' : 'text-gray-500'}`}>Monthly billing</button>
                    <button onClick={() => setBillingCycle('annual')} className={`px-4 py-2 rounded-lg shadow ${billingCycle === 'annual' ? 'bg-white' : 'text-gray-500'}`}>Annual billing</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {pricingData[billingCycle].map((plan, index) => (
                        <PricingCard
                            key={index}
                            title={plan.title}
                            price={plan.price}
                            description={plan.description}
                            features={plan.features}
                            popular={plan.popular}
                        />
                    ))}
                </div>
            </div>

            ) : (
              // Render normal content if the plan is not 'free'
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-700 mb-4">Connection Steps</h2>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Open WhatsApp on your phone</li>
                    <li>Tap Menu or Settings and select WhatsApp Web</li>
                    <li>Point your phone to this screen to capture the code</li>
                  </ol>
                </div>
    
                <div className="flex flex-col items-center justify-center">
                  {connectionStatus === 'ready' ? (
                    <div className="text-center">
                      <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 text-5xl mb-2" />
                      <p className="text-lg font-semibold text-gray-700">WhatsApp Connected!</p>
                    </div>
                  ) : connectionStatus === 'checking' ? (
                    <div className="text-center">
                      <FontAwesomeIcon icon={faSpinner} spin className="text-blue-500 text-5xl mb-2" />
                      <p className="text-lg font-semibold text-gray-700">Checking connection status...</p>
                    </div>
                  ) : connectionStatus === 'error' ? (
                    <div className="text-center">
                      <FontAwesomeIcon icon={faSpinner} className="text-red-500 text-5xl mb-2" />
                      <p className="text-lg font-semibold text-gray-700">Failed to connect</p>
                    </div>
                  ) : qrCode ? (
                    <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48 mb-4" />
                  ) : showConnectButton ? (
                    <button
                      onClick={handleConnect}
                      className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition duration-300"
                    >
                      Connect WhatsApp
                    </button>
                  ) : (
                    <></>
                  )}
                </div>
                  <p className="mt-4 text-gray-600">
                    Connection Status: <span className="font-semibold">{connectionStatus === 'ready' ? 'Ready' : connectionStatus}</span>
                  </p>
              </div>
            )}
    
          </div>
        </main>
      </div>
    );
  }


export default ConnectWa;