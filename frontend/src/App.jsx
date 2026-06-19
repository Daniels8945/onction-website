import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import HeroPanel from "./components/HeroPanel.jsx";
import Metrics from "./components/Metrics.jsx";
import About from "./components/About.jsx";
import Solutions from "./components/Solutions.jsx";
import Capability from "./components/Capability.jsx";
import Grow from "./components/Grow.jsx";
import CaseStudies from "./components/CaseStudies.jsx";
import Testimonials from "./components/Testimonials.jsx";
import Highlights from "./components/Highlights.jsx";
import Sdg from "./components/Sdg.jsx";
import Enquiry from "./components/Enquiry.jsx";
import Footer from "./components/Footer.jsx";

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <HeroPanel />
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
      <Footer />
    </>
  );
}
