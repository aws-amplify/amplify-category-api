import { Amplify } from 'aws-amplify';
import awsconfig from './aws-exports';
import '@aws-amplify/ui-react/styles.css';
import { AmplifyProvider } from '@aws-amplify/ui-react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import {
  Todos,
  Blogs,
  Listings,
} from './pages';

Amplify.configure(awsconfig);

const App = () => {
  return (
    <AmplifyProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/">
            <Route index element={<Navigate replace to="todos" />} />
            <Route path="todos" element={<Todos />} />
            <Route path="blogs" element={<Blogs />} />
            <Route path="listings" element={<Listings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AmplifyProvider>
  );
};

export default App;
