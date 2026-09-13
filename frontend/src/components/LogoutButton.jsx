import { useAuth } from "@clerk/react";

function LogoutButton() {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut({ redirectUrl: "/" });
  };

  return (
    <button onClick={handleLogout}>
      Logout
    </button>
  );
}

export default LogoutButton;