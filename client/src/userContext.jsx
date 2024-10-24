import axios from "axios";
import { createContext, useState,useEffect } from "react";

export const UserContext = createContext({});

export function UserContextProvider({ children }) {
  const [username, setUsername] = useState(null);
  const [id, setId] = useState(null);

  useEffect(()=>{
         axios.get('/profile').then(res=>{
          setUsername(res.data.username)
          setId(res.data.userId)

          console.log(username, id)
         }) 
  },[])
  return (
    <UserContext.Provider value={{username, setUsername, id, setId}}>
      {children}
    </UserContext.Provider>
  );
}
