import React, { useState } from 'react';
import ApiDemo from './components/ApiDemo';
import './App.css';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDemo, setShowDemo] = useState(true);
  console.log('App component mounted, showDemo:', showDemo);
  const fetchData = () => {
    setLoading(true);
    setError(null);
    setData(null);

    // The backend is configured to proxy requests starting with /api
    // to the js-backend service.
    fetch('/api/data')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(error => {
        setError(error.toString());
        setLoading(false);
      });
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>⚡ Electricity Consumption App</h1>
        <p>Monitor your electricity usage with data from Eloverblik</p>
        <p>By Daniel Baker Kristensen</p>
        
        <div className="nav-buttons">
          <button 
            onClick={() => setShowDemo(true)} 
            className={showDemo ? 'active' : ''}
          >
            🔍 API Demo
          </button>
          <button 
            onClick={() => setShowDemo(false)} 
            className={!showDemo ? 'active' : ''}
          >
            📊 Original App
          </button>
        </div>
      </header>

      {showDemo ? (
        <ApiDemo />
      ) : (
        <div className="original-app">
          <button onClick={fetchData} disabled={loading}>
            {loading ? 'Loading...' : 'Fetch Eloverblik Data'}
          </button>
          {error && <div style={{ color: 'red', marginTop: '20px' }}>Error: {error}</div>}
          {data && (
            <div style={{ marginTop: '20px', textAlign: 'left', width: '80%' }}>
              <h2>Data Received:</h2>
              <pre style={{ 
                backgroundColor: '#282c34',
                padding: '20px',
                borderRadius: '5px',
                border: '1px solid #61dafb',
                maxHeight: '400px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}>
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
