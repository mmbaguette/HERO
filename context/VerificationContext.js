import React, { createContext, useState, useContext } from 'react';

const VerificationContext = createContext();

export const VerificationProvider = ({ children }) => {
  const [verificationStatus, setVerificationStatus] = useState('unverified');
  const [verifiedNames, setVerifiedNames] = useState(new Set());

  const updateVerificationStatus = async (status, fullName) => {
    setVerificationStatus(status);
    if (status === 'verified' && fullName) {
      setVerifiedNames(prev => new Set([...prev, fullName]));
    }
  };

  const checkNameVerification = (name) => {
    return verifiedNames.has(name);
  };

  const checkVerificationStatus = async () => {
    return verificationStatus;
  };

  return (
    <VerificationContext.Provider value={{
      verificationStatus,
      updateVerificationStatus,
      checkVerificationStatus,
      checkNameVerification,
      verifiedNames
    }}>
      {children}
    </VerificationContext.Provider>
  );
};

export const useVerification = () => useContext(VerificationContext); 