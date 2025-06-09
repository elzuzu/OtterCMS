import { useState, useRef, useCallback, useEffect } from 'react';

export default function useTimedMessage(initialMessage = { text: '', type: '' }, defaultDuration = 7000) {
  const [message, setMessage] = useState(initialMessage);
  const timeoutRef = useRef(null);

  const clearMessage = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setMessage({ text: '', type: '' });
  }, []);

  const setTimedMessage = useCallback((newMessage, duration = defaultDuration) => {
    setMessage(newMessage);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setMessage({ text: '', type: '' });
      timeoutRef.current = null;
    }, duration);
  }, [defaultDuration]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { message, setTimedMessage, clearMessage };
}
