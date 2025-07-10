import React, { useState } from 'react';
import { databaseService } from '../services/databaseService';
import apiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const ApiTest = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState([]);
  const { user } = useAuth();

  const addResult = (test, success, message, data = null) => {
    setResults(prev => [...prev, {
      test,
      success,
      message,
      data,
      timestamp: new Date().toISOString()
    }]);
  };

  const runTests = async () => {
    if (!user) {
      toast.error('Please log in first');
      return;
    }

    setTesting(true);
    setResults([]);

    try {
      // Test 1: Database connectivity
      addResult('Database', true, 'Starting database tests...');
      
      const statsResult = await databaseService.getDashboardStats(user.id);
      addResult(
        'Dashboard Stats', 
        statsResult.success, 
        statsResult.success ? 'Successfully fetched dashboard stats' : statsResult.error,
        statsResult.data
      );

      // Test 2: Collections
      const testCollection = {
        name: `Test Collection ${Date.now()}`,
        description: 'API integration test collection',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      };

      const collectionResult = await databaseService.createCollection(testCollection);
      addResult(
        'Create Collection',
        collectionResult.success,
        collectionResult.success ? 'Collection created successfully' : collectionResult.error,
        collectionResult.data
      );

      if (collectionResult.success) {
        // Test 3: Batch creation
        const batchResult = await databaseService.createBatch({
          name: `Test Batch ${Date.now()}`,
          collectionId: collectionResult.data.id,
          processingOptions: { ocrEnabled: true }
        });

        addResult(
          'Create Batch',
          batchResult.success,
          batchResult.success ? 'Batch created successfully' : batchResult.error,
          batchResult.data
        );
      }

      // Test 4: API Gateway connectivity
      addResult('API Gateway', true, 'Testing API Gateway connectivity...');
      
      // Test API Gateway connection
      const apiHealthResult = await databaseService.getAPIHealthStatus();
      addResult(
        'API Gateway Health',
        apiHealthResult.success,
        apiHealthResult.success ? 
          `API Gateway is ${apiHealthResult.data.status}` : 
          apiHealthResult.error,
        apiHealthResult.data
      );

      // Test API Gateway connection directly
      if (databaseService.isAPIGatewayAvailable()) {
        try {
          const apiTestResult = await apiService.testConnection();
          addResult(
            'API Gateway Test',
            true,
            'API Gateway connection successful',
            apiTestResult
          );
        } catch (error) {
          addResult(
            'API Gateway Test',
            false,
            `API Gateway connection failed: ${error.message}`,
            null
          );
        }
      } else {
        addResult(
          'API Gateway Test',
          false,
          'API Gateway URL not configured in environment variables',
          null
        );
      }
      
      // Test API Gateway user endpoint
      try {
        const usersResult = await apiService.getUsers();
        addResult(
          'API Gateway Users',
          true,
          'Successfully fetched users from API Gateway',
          usersResult
        );
      } catch (error) {
        addResult(
          'API Gateway Users',
          false,
          `Failed to fetch users from API Gateway: ${error.message}`,
          null
        );
      }

      // Test 5: Fetch batches
      const batchesResult = await databaseService.getAllBatches();
      addResult(
        'Fetch Batches',
        batchesResult.success,
        batchesResult.success ? `Fetched ${batchesResult.data?.length || 0} batches` : batchesResult.error,
        batchesResult.data
      );

      // Test 6: Recent batches view
      const recentBatchesResult = await databaseService.getRecentBatches();
      addResult(
        'Recent Batches View',
        recentBatchesResult.success,
        recentBatchesResult.success ? `Fetched ${recentBatchesResult.data?.length || 0} recent batches` : recentBatchesResult.error,
        recentBatchesResult.data
      );

      addResult('Test Suite', true, 'All tests completed!');

    } catch (error) {
      addResult('Test Suite', false, `Test suite error: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  if (!user) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>API Integration Test</h2>
        <p>Please log in to run API tests</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>API Integration Test</h2>
      <p>Test the integration between frontend, backend API, and database.</p>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runTests} 
          disabled={testing}
          style={{
            padding: '10px 20px',
            backgroundColor: testing ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: testing ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {testing ? 'Running Tests...' : 'Run Tests'}
        </button>
        
        <button 
          onClick={clearResults}
          disabled={testing}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: testing ? 'not-allowed' : 'pointer'
          }}
        >
          Clear Results
        </button>
      </div>

      <div>
        <h3>Test Results</h3>
        {results.length === 0 ? (
          <p style={{ color: '#666' }}>No tests run yet.</p>
        ) : (
          <div style={{ border: '1px solid #ddd', borderRadius: '4px', maxHeight: '500px', overflowY: 'auto' }}>
            {results.map((result, index) => (
              <div 
                key={index}
                style={{
                  padding: '10px',
                  borderBottom: index < results.length - 1 ? '1px solid #eee' : 'none',
                  backgroundColor: result.success ? '#f8f9fa' : '#fff5f5'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: result.success ? '#28a745' : '#dc3545' }}>
                    {result.success ? '✓' : '✗'} {result.test}
                  </strong>
                  <small style={{ color: '#666' }}>
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </small>
                </div>
                <div style={{ marginTop: '5px', color: '#666' }}>
                  {result.message}
                </div>
                {result.data && (
                  <details style={{ marginTop: '5px' }}>
                    <summary style={{ cursor: 'pointer', color: '#007bff' }}>View Data</summary>
                    <pre style={{ 
                      marginTop: '5px', 
                      padding: '10px', 
                      backgroundColor: '#f8f9fa', 
                      borderRadius: '4px',
                      overflow: 'auto',
                      fontSize: '12px'
                    }}>
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h4>Environment Info</h4>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li><strong>API Gateway URL:</strong> {process.env.REACT_APP_API_GATEWAY_URL || 'Not set'}</li>
          <li><strong>Supabase URL:</strong> {process.env.REACT_APP_SUPABASE_URL || 'Not set'}</li>
          <li><strong>CloudFront Domain:</strong> {process.env.REACT_APP_AWS_CLOUDFRONT_DOMAIN || 'Not set'}</li>
          <li><strong>User ID:</strong> {user?.id || 'Not logged in'}</li>
        </ul>
      </div>
    </div>
  );
};

export default ApiTest;