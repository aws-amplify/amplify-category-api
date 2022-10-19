import { Flex } from "@aws-amplify/ui-react";
import { Link } from "react-router-dom";

export const NavBar = () => {
  return (
    <Flex direction='row'>
      <Link to="/todos">Todos</Link> |{" "}
      <Link to="/blogs">Blogs</Link> |{" "}
      <Link to="/listings">Listings</Link> |{" "}
      <Link to="/auth-modes">Auth Modes</Link>
    </Flex>
  );
};
