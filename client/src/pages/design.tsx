
import { useEffect, useRef, useState } from "react";

export default function Design() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const [isPiP, setIsPiP] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const hero = heroRef.current;
    
    if (!video || !hero) return;

    // Auto-play on mount
    video.play().catch(err => console.log("Autoplay blocked:", err));

    const handleScroll = () => {
      const heroBottom = hero.getBoundingClientRect().bottom;
      
      // When hero scrolls out of view, enable PiP
      if (heroBottom < 0 && !isPiP && document.pictureInPictureEnabled) {
        video.requestPictureInPicture()
          .then(() => setIsPiP(true))
          .catch(err => console.log("PiP failed:", err));
      }
      
      // When scrolling back to hero, exit PiP
      if (heroBottom >= 0 && isPiP && document.pictureInPicture) {
        document.exitPictureInPicture()
          .then(() => setIsPiP(false))
          .catch(err => console.log("Exit PiP failed:", err));
      }
    };

    window.addEventListener("scroll", handleScroll);
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (document.pictureInPicture) {
        document.exitPictureInPicture().catch(() => {});
      }
    };
  }, [isPiP]);

  return (
    <div className="min-h-screen bg-[#F3F1E9]">
      {/* Hero Video Section */}
      <div 
        ref={heroRef}
        className="relative w-full h-screen overflow-hidden"
      >
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          src="/brand/UnderItAll__One_Rip_at_a_Time_1761161991644.mp4"
        />
        
        {/* Overlay gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        
        {/* Hero Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-white px-4">
          <h1 className="text-5xl md:text-7xl font-['Archivo'] font-bold mb-6 text-center">
            One Rip at a Time
          </h1>
          <p className="text-xl md:text-2xl font-['Lora'] italic max-w-3xl text-center">
            Revolutionizing rug installation, one seamless cut at a time
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <section className="mb-16">
          <h2 className="text-4xl font-['Archivo'] font-bold text-[#212227] mb-6">
            The UnderItAll Philosophy
          </h2>
          <p className="text-lg text-[#696A6D] font-['Vazirmatn'] leading-relaxed mb-4">
            We believe in precision. We believe in craftsmanship. Every rug deserves 
            the perfect foundation—custom-cut, perfectly fitted, installed with the 
            care it takes to preserve beauty for generations.
          </p>
          <p className="text-lg text-[#696A6D] font-['Vazirmatn'] leading-relaxed">
            Our scissorless installation method isn't just technique—it's philosophy. 
            It's respect for materials, respect for artistry, respect for the spaces 
            we inhabit.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="text-4xl font-['Archivo'] font-bold text-[#212227] mb-6">
            Design Principles
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-[22px] p-8 shadow-lg">
              <h3 className="text-2xl font-['Archivo'] font-semibold text-[#F2633A] mb-4">
                Custom Precision
              </h3>
              <p className="text-[#696A6D] font-['Vazirmatn']">
                Every pad is crafted to your exact specifications. No compromises, 
                no generic solutions—just perfect fit, every time.
              </p>
            </div>
            
            <div className="bg-white rounded-[22px] p-8 shadow-lg">
              <h3 className="text-2xl font-['Archivo'] font-semibold text-[#F2633A] mb-4">
                Material Excellence
              </h3>
              <p className="text-[#696A6D] font-['Vazirmatn']">
                Premium felt and natural rubber, sourced for durability and 
                performance. Your rugs deserve the best foundation.
              </p>
            </div>
            
            <div className="bg-white rounded-[22px] p-8 shadow-lg">
              <h3 className="text-2xl font-['Archivo'] font-semibold text-[#F2633A] mb-4">
                Seamless Integration
              </h3>
              <p className="text-[#696A6D] font-['Vazirmatn']">
                Our installation method ensures invisible protection—your rugs 
                take center stage while our pads work quietly beneath.
              </p>
            </div>
            
            <div className="bg-white rounded-[22px] p-8 shadow-lg">
              <h3 className="text-2xl font-['Archivo'] font-semibold text-[#F2633A] mb-4">
                Trusted Partnerships
              </h3>
              <p className="text-[#696A6D] font-['Vazirmatn']">
                Built for designers, installers, and retailers who demand 
                excellence. We're your partner in craftsmanship.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-4xl font-['Archivo'] font-bold text-[#212227] mb-6">
            The Scissorless Advantage
          </h2>
          <p className="text-lg text-[#696A6D] font-['Vazirmatn'] leading-relaxed mb-6">
            Traditional installation methods can damage fibers, create uneven edges, 
            and compromise the integrity of your investment. Our proprietary scissorless 
            technique ensures:
          </p>
          <ul className="space-y-4">
            {[
              "Clean, precise cuts that protect rug integrity",
              "Perfect edge alignment for seamless appearance",
              "Reduced installation time without sacrificing quality",
              "Enhanced longevity for both pad and rug"
            ].map((item, idx) => (
              <li key={idx} className="flex items-start">
                <span className="text-[#F2633A] text-2xl mr-4">→</span>
                <span className="text-lg text-[#696A6D] font-['Vazirmatn']">{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
