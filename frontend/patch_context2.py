import re

with open("src/contexts/AppContext.tsx", "r") as f:
    content = f.read()

# Add useAuth import
content = content.replace("import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback, useState } from 'react';", "import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback, useState } from 'react';\nimport { useAuth } from './AuthContext';")

# Add fetchData function and useAuth to AppProvider
fetch_logic = """  const { token, logout } = useAuth();

  const fetchData = useCallback(async () => {
    if (!token) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [tasksRes, clientsRes, usersRes, campaignsRes] = await Promise.all([
        fetch(`${baseUrl}/api/tasks`, { headers }),
        fetch(`${baseUrl}/api/clients`, { headers }),
        fetch(`${baseUrl}/api/users`, { headers }),
        fetch(`${baseUrl}/api/campaigns`, { headers })
      ]);

      if (tasksRes.status === 401 || clientsRes.status === 401) {
        logout();
        return;
      }

      const tasks = tasksRes.ok ? await tasksRes.json() : [];
      const clients = clientsRes.ok ? await clientsRes.json() : [];
      const users = usersRes.ok ? await usersRes.json() : [];
      const campaigns = campaignsRes.ok ? await campaignsRes.json() : [];

      dispatch({ type: 'HYDRATE_STATE', payload: {
        tasks: tasks.data || tasks,
        clients: clients.data || clients,
        teamMembers: users.data || users,
        campaigns: campaigns.data || campaigns,
        isGlobalLoading: false,
        globalError: null
      } as any });
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: 'Could not load tasks' });
    }
  }, [token, logout]);

  useEffect(() => {
    if (token) {
      fetchData();
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [token, fetchData]);
"""
content = content.replace("export function AppProvider({ children }: { children: React.ReactNode }) {", "export function AppProvider({ children }: { children: React.ReactNode }) {\n" + fetch_logic)
content = content.replace("const [state, dispatch] = useReducer(appReducer, initialState);", "const [state, dispatch] = useReducer(appReducer, initialState);")

# Update AppContextValue to include reloadData
content = content.replace("setScreenShareMode: (active: boolean) => void;", "setScreenShareMode: (active: boolean) => void;\n  reloadData: () => void;")
content = content.replace("return (\n    <AppContext.Provider value={{", "return (\n    <AppContext.Provider value={{\n      reloadData: fetchData,")

with open("src/contexts/AppContext.tsx", "w") as f:
    f.write(content)
