import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserContextType {
  userName: string | null;
  setUserName: (name: string) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userName, setUserNameState] = useState<string | null>(() => {
    return localStorage.getItem('puff_user_name');
  });

  const setUserName = (name: string) => {
    localStorage.setItem('puff_user_name', name);
    setUserNameState(name);
  };

  const logout = () => {
    localStorage.removeItem('puff_user_name');
    setUserNameState(null);
  };

  return (
    <UserContext.Provider value={{ userName, setUserName, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
