import Hero from "./components/Hero.jsx";
import HeroPanel from "./components/HeroPanel.jsx";
import Metrics from "./components/Metrics.jsx";
import EcosystemStory from "./components/story/EcosystemStory.jsx";
import About from "./components/About.jsx";
import Solutions from "./components/Solutions.jsx";
import Capability from "./components/Capability.jsx";
import Grow from "./components/Grow.jsx";
import CaseStudies from "./components/CaseStudies.jsx";
import Testimonials from "./components/Testimonials.jsx";
import Highlights from "./components/Highlights.jsx";
import Sdg from "./components/Sdg.jsx";
import Enquiry from "./components/Enquiry.jsx";

export default function App() {
  return (
    <>
      <main>
        <Hero />
        <HeroPanel />
        <EcosystemStory />
        <Metrics />
        <About />
        <Solutions />
        <Capability />
        <Grow />
        <CaseStudies />
        <Testimonials />
        <Highlights />
        <Sdg />
        <Enquiry />
      </main>
    </>
  );
}
