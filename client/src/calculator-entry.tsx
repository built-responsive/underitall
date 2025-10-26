
import React from 'react';
import ReactDOM from 'react-dom/client';
import Calculator from './pages/calculator';
import './index.css';

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCalculator);
} else {
  initCalculator();
}

function initCalculator() {
  const rootElement = document.getElementById('underitall-calculator-root');
  
  if (rootElement) {
    console.log('🚀 Mounting calculator to:', rootElement);
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <Calculator />
      </React.StrictMode>
    );
  } else {
    console.error('❌ Calculator root element not found');
  }
}
