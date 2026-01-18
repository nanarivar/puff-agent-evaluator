import Hero from "@/components/ui/animated-shader-hero";

const Index = () => {
  const handleGetStarted = () => {
    console.log('Get Started clicked');
  };

  const handleLearnMore = () => {
    console.log('Learn More clicked');
  };

  return (
    <Hero
      trustBadge={{
        text: "Precision AI evaluation for enterprise teams",
        icons: ["◆"]
      }}
      headline={{
        line1: "Know Your Agents",
        line2: "Measure Performance"
      }}
      subtitle="PUFF is the meta-agent that reviews AI agents. Know which agents perform, why they perform, and how to improve them."
      buttons={{
        primary: {
          text: "Start Evaluation",
          onClick: handleGetStarted
        },
        secondary: {
          text: "View Documentation",
          onClick: handleLearnMore
        }
      }}
    />
  );
};

export default Index;
