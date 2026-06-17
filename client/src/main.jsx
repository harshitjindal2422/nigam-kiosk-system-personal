import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import './index.css'
import App from './App.jsx'

// Catch and ignore message channel closure errors from browser extensions
window.addEventListener('unhandledrejection', (event) => {
  const reasonStr = event.reason ? (event.reason.message || String(event.reason)) : '';
  if (
    reasonStr.includes('message channel closed before a response was received') ||
    reasonStr.includes('A listener indicated an asynchronous response')
  ) {
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  const messageStr = event.message || '';
  if (
    messageStr.includes('message channel closed before a response was received') ||
    messageStr.includes('A listener indicated an asynchronous response')
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')).render(
  <>
    <App />
  </>
)

