import axios from "axios";
import { useState } from "react";
import { useContext } from "react";
import { UserContext } from "./userContext";

export default function RegisterAndLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginOrRegister, setIsLoginOrRegister] = useState("login");
  const { setUsername: setLoggedInUsername, setId } = useContext(UserContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = isLoginOrRegister === "register" ? "/register" : "/login";
      const res = await axios.post(url, { username, password });
      console.log(res.data);
      setLoggedInUsername(username);
      setId(res.data.id);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="bg-blue-50 h-screen flex items-center">
      <form onSubmit={handleSubmit} className="w-64 mx-auto mb-12">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          type="text"
          placeholder="Username"
          className="block border p-2 mb-2 rounded-sm w-full"
        />
        <input
          type="password"
          placeholder="password"
          className="block border p-2 mb-2 rounded-sm w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="bg-blue-500 text-white block w-full p-2 rounded-sm">
          {isLoginOrRegister === "register" ? "Register" : "Login"}
        </button>
        <div className="text-center mt-2">
          {isLoginOrRegister === "register" && (
            <div>
              Already a member?
              <button onClick={() => setIsLoginOrRegister("login")}>
                 {" "} Login Here
              </button>
            </div>
          )}
          {isLoginOrRegister === "login" && (
            <div>
              Not a member?
              <button onClick={() => setIsLoginOrRegister("register")}>
                Register Here
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
