import { useNavigate } from 'react-router-dom';
import Hero from "@/components/ui/animated-shader-hero";
import puffLogo from "@/assets/puff-character.png";

const Index = () => {
  const navigate = useNavigate();

  const handleCreateQuestions = () => {
    navigate('/n8n-workflows');
  };

  return (
    <Hero
      logo={puffLogo}
      trustBadge={{
        text: "Precision AI evaluation for enterprise teams",
        icons: ["◆"]
      }}
      headline={{
        line1: "PUFF",
        line2: ""
      }}
      subtitle="PUFF is the meta-agent that reviews AI agents. Know which agents perform, why they perform, and how to improve them."
      buttons={{
        primary: {
          text: "Create Questions",
          onClick: handleCreateQuestions
        }
      }}
    />
  );
};

export default Index;
