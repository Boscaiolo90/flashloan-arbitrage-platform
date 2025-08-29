      
import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

const API = 'https://dex-trader.preview.emergentagent.com/api';

function App() {
  const [botStatus, setBotStatus] = useState({
    active: false,
    total_profits: 0,
    successful_trades: 0,
    failed_trades: 0,
    active_opportunities: 0
  });

  const [opportunities, setOpportunities] = useState([]);
  const [walletConnected, setWalletConnected] = useState(false);
  const [contractStatus, setContractStatus] = useState({
    deployed: false,
    address: null,
    txHash: null,
    deploying: false
  });

  useEffect(() => {
    fetchBotStatus();
    fetchContractStatus();
    const interval = setInterval(() => {
      fetchBotStatus();
      fetchOpportunities();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchBotStatus = async () => {
    try {
      const response = await axios.get(`${API}/bot/status`);
      setBotStatus(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchContractStatus = async () => {
    try {
      const response = await axios.get(`${API}/contract/status`);
      setContractStatus(response.data);
    } catch (error) {
      console.error('Error fetching contract status:', error);
    }
  };

  const fetchOpportunities = async () => {
    try {
      const response = await axios.get(`${API}/opportunities`);
      setOpportunities(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletConnected(true);
      } catch (error) {
        console.error('Error connecting wallet:', error);
      }
    } else {
      alert('MetaMask is not installed!');
    }
  };

  const deployContract = async () => {
    if (!walletConnected) {
      alert('Please connect your wallet first!');
      return;
    }
    
    try {
      setContractStatus(prev => ({...prev, deploying: true}));
      const response = await axios.post(`${API}/contract/deploy`);
      setContractStatus({
        deployed: true,
        address: response.data.address,
        txHash: response.data.txHash,
        deploying: false
      });
      alert('Contract deployed successfully!');
    } catch (error) {
      console.error('Error deploying contract:', error);
      setContractStatus(prev => ({...prev, deploying: false}));
      alert('Failed to deploy contract');
    }
  };

  const startBot = async () => {
    try {
      await axios.post(`${API}/bot/start`);
      fetchBotStatus();
    } catch (error) {
      console.error('Error starting bot:', error);
    }
  };

  const stopBot = async () => {
    try {
      await axios.post(`${API}/bot/stop`);
      fetchBotStatus();
      setOpportunities([]);
    } catch (error) {
      console.error('Error stopping bot:', error);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <div>
              <h1>FlashLoan Arbitrage</h1>
              <p>Real Web3 Integration • Automated DEX Trading</p>
            </div>
          </div>
          <div className="status-badges">
            <span className={`badge ${walletConnected ? 'connected' : 'disconnected'}`}>
              {walletConnected ? 'Connected' : 'Not Connected'}
            </span>
            <span className={`badge ${contractStatus.deployed ? 'deployed' : 'not-deployed'}`}>
              {contractStatus.deployed ? 'Contract Deployed' : 'Contract Not Deployed'}
            </span>
            <span className={`badge ${botStatus.active ? 'active' : 'inactive'}`}>
              {botStatus.active ? 'Bot Active' : 'Bot Inactive'}
            </span>
          </div>
        </div>
      </header>

      <div className="container">
        {!walletConnected && (
          <div className="wallet-alert">
            <div className="alert-content">
              <h3>Web3 Connection Required</h3>
              <p>Connect your wallet to enable real arbitrage trading on Base network</p>
              <button onClick={connectWallet} className="btn btn-primary">
                Connect Wallet
              </button>
            </div>
          </div>
        )}

        {walletConnected && !contractStatus.deployed && (
          <div className="contract-deploy-section">
            <div className="deploy-content">
              <h3>🔷 Deploy FlashLoan Contract to Base Network</h3>
              <p>Deploy your arbitrage contract to Base network to start earning</p>
              <div className="deploy-info">
                <span>⛽ Gas Cost: ~0.001 ETH</span>
                <span>🌐 Network: Base Mainnet</span>
                <span>⚡ Ready for deployment</span>
              </div>
              <button 
                onClick={deployContract} 
                disabled={contractStatus.deploying}
                className="btn btn-deploy"
              >
                {contractStatus.deploying ? '⏳ Deploying...' : '🚀 Deploy Contract'}
              </button>
            </div>
          </div>
        )}

        {contractStatus.deployed && (
          <div className="contract-status">
            <div className="contract-info">
              <h3>✅ Contract Deployed Successfully</h3>
              <div className="contract-details">
                <p><strong>Address:</strong> {contractStatus.address}</p>
                <p><strong>Tx Hash:</strong> {contractStatus.txHash}</p>
                <p><strong>Network:</strong> Base Mainnet</p>
                <a href={`https://basescan.org/tx/${contractStatus.txHash}`} target="_blank" rel="noopener noreferrer">
                  View on BaseScan →
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-card profits">
            <h3>Total Profits</h3>
            <div className="stat-value">{botStatus.total_profits.toFixed(6)} ETH</div>
            <div className="stat-subtitle">≈ ${(botStatus.total_profits * 2500).toFixed(2)}</div>
          </div>
          <div className="stat-card trades">
            <h3>Successful Trades</h3>
            <div className="stat-value">{botStatus.successful_trades}</div>
            <div className="stat-subtitle">Trades completed</div>
          </div>
          <div className="stat-card opportunities">
            <h3>Active Opportunities</h3>
            <div className="stat-value">{botStatus.active_opportunities}</div>
            <div className="stat-subtitle">{botStatus.active ? 'Real-time scanning' : 'Bot inactive'}</div>
          </div>
          <div className="stat-card failed">
            <h3>Failed Trades</h3>
            <div className="stat-value">{botStatus.failed_trades}</div>
            <div className="stat-subtitle">Learning from failures</div>
          </div>
        </div>

        <div className="bot-controls">
          <div className="controls-info">
            <h3>🤖 Arbitrage Bot Controls</h3>
            <p>{botStatus.active ? 'Bot is actively scanning for opportunities' : 'Demo mode - simulating opportunities'}</p>
            <div className="status-info">
              <span className={`status ${botStatus.active ? 'active' : 'inactive'}`}>
                Status: {botStatus.active ? 'Active' : 'Inactive'}
              </span>
              <span>• Monitoring Uniswap V3, SushiSwap, and PancakeSwap</span>
            </div>
          </div>
          <div className="controls-buttons">
            <button
              onClick={startBot}
              disabled={botStatus.active || !contractStatus.deployed}
              className="btn btn-success"
            >
              ▶ Start Bot
            </button>
            <button
              onClick={stopBot}
              disabled={!botStatus.active}
              className="btn btn-danger"
            >
              ⏹ Stop Bot
            </button>
          </div>
          {!contractStatus.deployed && (
            <p className="deploy-warning">⚠️ Deploy contract first to enable bot</p>
          )}
        </div>

        <div className="opportunities-section">
          <h2>Live Arbitrage Opportunities ({opportunities.length})</h2>
          <div className="opportunities-grid">
            {opportunities.map((opp) => (
              <div key={opp.id} className="opportunity-card">
                <div className="opp-info">
                  <h3>{opp.token_pair}</h3>
                  <p>{opp.dex_from} → {opp.dex_to}</p>
                </div>
                <div className="opp-profit">
                  <div className="profit-eth">+{opp.profit_eth.toFixed(6)} ETH</div>
                  <div className="profit-usd">${opp.profit_usd.toFixed(2)}</div>
                </div>
              </div>
            ))}
            {opportunities.length === 0 && (
              <div className="no-opportunities">
                <p>No opportunities found. {!botStatus.active && 'Deploy contract and start the bot to begin scanning.'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer>
        <p>Made with 💜 Emergent</p>
      </footer>
    </div>
  );
}

export default App;       
