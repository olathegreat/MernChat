import { useContext, useEffect } from "react";
import axios from "axios";
import { UserContext, UserContextProvider } from "./userContext";
import Routes from "./Routes";

function App() {
  axios.defaults.baseURL = "http://localhost:4000";
  axios.defaults.withCredentials = true;
  const { setUsername, setId } = useContext(UserContext);

  useEffect(() => {
    // Automatically authenticate the user on page load
    const checkLoggedIn = async () => {
      try {
        const res = await axios.get("/profile"); // Verify token via /profile endpoint
        setUsername(res.data.username); // Set the username in context
        setId(res.data.userId); // Set the userId in context
      } catch (err) {
        console.log("No token found or invalid token");
      }
    };

    checkLoggedIn(); // Call the function on app load
  }, [setUsername, setId]);

  return (
    <UserContextProvider>
      <Routes />
    </UserContextProvider>
  );
}

export default App;

