import { BrowserRouter, Route, Routes } from "react-router";
import { Shell } from "@/components/Shell";
import { HomePage } from "@/pages/HomePage";
import { SignInPage } from "@/pages/SignInPage";
import { TopicPage } from "@/pages/TopicPage";

/** Anyone can read; signed-in, allowlisted editors see the editing controls. */
export default function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/:slug" element={<TopicPage />} />
          <Route path="/:slug/:pageId" element={<TopicPage />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}
