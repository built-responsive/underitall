import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";

export default function SyncArchitecture() {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const video1Ref = useRef<HTMLIFrameElement>(null);
  const video2Ref = useRef<HTMLIFrameElement>(null);
  const [isPiP1, setIsPiP1] = useState(false);
  const [isPiP2, setIsPiP2] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!video1Ref.current || !video2Ref.current) return;

      const video1Rect = video1Ref.current.getBoundingClientRect();
      const video2Rect = video2Ref.current.getBoundingClientRect();

      // Video 1 PiP logic
      if (video1Rect.bottom < 0 && !isPiP1) {
        setIsPiP1(true);
      } else if (video1Rect.top >= 0 && isPiP1) {
        setIsPiP1(false);
      }

      // Video 2 PiP logic
      if (video2Rect.bottom < 0 && !isPiP2) {
        setIsPiP2(true);
      } else if (video2Rect.top >= 0 && isPiP2) {
        setIsPiP2(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isPiP1, isPiP2]);

  useEffect(() => {
    if (!chartRef.current) return;

    // Dynamically import Chart.js
    import("chart.js/auto").then((Chart) => {
      const ctx = chartRef.current?.getContext("2d");
      if (!ctx) return;

      const webhookData = {
        labels: [
          ["metaobjects/", "update"],
          ["customers/", "update"],
          ["clarity/", "account_create"],
          ["clarity/", "contact_create"],
        ],
        datasets: [
          {
            label: "Webhook Events per Day (Sample)",
            data: [120, 450, 115, 430],
            backgroundColor: "#F2633A",
            borderColor: "#212227",
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      };

      new Chart.default(ctx, {
        type: "bar",
        data: webhookData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: function (tooltipItems) {
                  const item = tooltipItems[0];
                  let label = item.chart.data.labels[item.dataIndex];
                  if (Array.isArray(label)) {
                    return label.join("");
                  }
                  return label;
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: "#E1E0DA" },
              ticks: { color: "#212227" },
            },
            x: {
              grid: { display: false },
              ticks: { color: "#212227" },
            },
          },
        },
      });
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F3F1E9] py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-['Archivo'] font-bold text-[#212227] mb-4">
            Shopify ↔ Clarity CRM Sync Architecture
          </h1>
          <p className="text-lg text-[#696A6D] max-w-3xl mx-auto font-['Lora'] italic">
            An automated, real-time data synchronization pipeline ensuring data
            integrity between e-commerce and customer relationship management
            systems.
          </p>
        </header>

        {/* High-Level Flow */}
        <section className="mb-12">
          <h2 className="text-3xl font-['Archivo'] font-semibold text-center mb-8 text-[#212227]">
            High-Level Data Flow
          </h2>

          {/* Centered Video */}
          <div className="flex justify-center mb-8">
            <iframe
              ref={video1Ref}
              id="ytplayer"
              type="text/html"
              width="720"
              height="405"
              className={`rounded-[22px] shadow-lg transition-all duration-300 ${
                isPiP1 ? "fixed bottom-4 left-4 w-[320px] h-[180px] z-50" : ""
              }`}
              src="https://www.youtube.com/embed/videoseries?si=lygffDjpDqZ_OSMZ&amp;list=PLGRhaZVpS3zEWykUahV3yw0Q9ANmfzmSe"
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>

          {/* Centered Cards Below */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <Card className="rounded-[22px] shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-2">🛍️</div>
                <h3 className="text-2xl font-['Archivo'] font-semibold text-[#212227]">
                  Shopify
                </h3>
                <p className="text-[#696A6D] font-['Vazirmatn']">
                  Source of Truth
                </p>
              </CardContent>
            </Card>
            <div className="text-[#F2633A] text-3xl font-bold transform md:rotate-0 rotate-90">
              →
            </div>
            <Card className="rounded-[22px] shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-2">⚙️</div>
                <h3 className="text-2xl font-['Archivo'] font-semibold text-[#212227]">
                  Our Application
                </h3>
                <p className="text-[#696A6D] font-['Vazirmatn']">
                  Webhook Processor
                </p>
              </CardContent>
            </Card>
            <div className="text-[#F2633A] text-3xl font-bold transform md:rotate-0 rotate-90">
              →
            </div>
            <Card className="rounded-[22px] shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-2">📊</div>
                <h3 className="text-2xl font-['Archivo'] font-semibold text-[#212227]">
                  Clarity CRM
                </h3>
                <p className="text-[#696A6D] font-['Vazirmatn']">
                  Destination System
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Phase I: Onboarding */}
        <section className="mb-12">
          <h2 className="text-3xl font-['Archivo'] font-semibold text-center mb-8 text-[#212227]">
            Phase I: The Onboarding Journey
          </h2>
          <p className="text-center text-[#696A6D] max-w-3xl mx-auto mb-8 font-['Vazirmatn']">
            When a new wholesale partner is onboarded, a linear data flow
            creates and links accounts across all platforms.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                num: 1,
                title: "Registration Submitted",
                desc: "A new partner submits the registration form. Data is saved to a PostgreSQL table with a pending status.",
              },
              {
                num: 2,
                title: "Admin Approval",
                desc: "An admin verifies credentials in the dashboard and approves the application, triggering the creation flow.",
              },
              {
                num: 3,
                title: "Shopify Metaobject Creation",
                desc: "A wholesale_account metaobject is created in Shopify to store all company-level information.",
              },
              {
                num: 4,
                title: "Shopify Customer Creation",
                desc: "A customer record is created and linked back to the company's metaobject via a metafield reference.",
              },
              {
                num: 5,
                title: "Clarity CRM Account Sync",
                desc: "A new Account is created in Clarity CRM. The returned AccountId is immediately saved back to the Shopify metaobject.",
              },
              {
                num: 6,
                title: "CRM Contact & Attachment",
                desc: "An associated Contact is created in the CRM, and the partner's tax document is uploaded as an attachment.",
              },
            ].map((step) => (
              <Card
                key={step.num}
                className="rounded-[16px] shadow-md border-l-4 border-[#F2633A]"
              >
                <CardContent className="p-6">
                  <h3 className="font-['Archivo'] font-semibold text-xl mb-2 text-[#212227]">
                    <span className="text-[#F2633A]">{step.num}.</span>{" "}
                    {step.title}
                  </h3>
                  <p className="text-[#696A6D] font-['Vazirmatn'] text-sm">
                    {step.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Phase II: Sync */}
        <section className="mb-12">
          

          <h2 className="text-3xl font-['Archivo'] font-semibold text-center mb-8 text-[#212227]">
            Phase II: Keeping Everything in Sync
          </h2>
          <p className="text-center text-[#696A6D] max-w-3xl mx-auto mb-8 font-['Vazirmatn']">
            Robust webhooks ensure that any changes made in Shopify are
            instantly reflected in Clarity CRM.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="rounded-[22px] shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-2xl font-['Archivo'] font-semibold mb-4 text-[#212227] text-center">
                  🏢 Company Sync
                </h3>
                <p className="text-center text-sm text-[#696A6D] mb-6 font-['Vazirmatn']">
                  via metaobjects/update webhook
                </p>
                <div className="space-y-4">
                  <div className="bg-[#F3F1E9] p-4 rounded-[11px]">
                    <p className="font-['Vazirmatn'] font-semibold text-[#212227]">
                      Trigger:
                    </p>
                    <p className="text-[#696A6D] font-['Vazirmatn'] text-sm">
                      wholesale_account metaobject is updated in Shopify.
                    </p>
                  </div>
                  <div className="bg-[#F3F1E9] p-4 rounded-[11px]">
                    <p className="font-['Vazirmatn'] font-semibold text-[#212227]">
                      Logic:
                    </p>
                    <p className="text-[#696A6D] font-['Vazirmatn'] text-sm">
                      The app verifies the webhook and checks for the clarity_id
                      in the payload.
                    </p>
                  </div>
                  <div className="bg-[#F3F1E9] p-4 rounded-[11px]">
                    <p className="font-['Vazirmatn'] font-semibold text-[#212227]">
                      CRM Action:
                    </p>
                    <p className="text-[#696A6D] font-['Vazirmatn'] text-sm">
                      Updates the corresponding Account record in Clarity CRM.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[22px] shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-2xl font-['Archivo'] font-semibold mb-4 text-[#212227] text-center">
                  👤 Contact Sync
                </h3>
                <p className="text-center text-sm text-[#696A6D] mb-6 font-['Vazirmatn']">
                  via customers/update webhook
                </p>
                <div className="space-y-4">
                  <div className="bg-[#F3F1E9] p-4 rounded-[11px]">
                    <p className="font-['Vazirmatn'] font-semibold text-[#212227]">
                      Trigger:
                    </p>
                    <p className="text-[#696A6D] font-['Vazirmatn'] text-sm">
                      An individual customer record is updated in Shopify.
                    </p>
                  </div>
                  <div className="bg-[#F3F1E9] p-4 rounded-[11px]">
                    <p className="font-['Vazirmatn'] font-semibold text-[#212227]">
                      Logic:
                    </p>
                    <p className="text-[#696A6D] font-['Vazirmatn'] text-sm">
                      The app retrieves the linked company's clarity_id from the
                      customer's metaobject.
                    </p>
                  </div>
                  <div className="bg-[#F3F1E9] p-4 rounded-[11px]">
                    <p className="font-['Vazirmatn'] font-semibold text-[#212227]">
                      CRM Action:
                    </p>
                    <p className="text-[#696A6D] font-['Vazirmatn'] text-sm">
                      Updates the corresponding Contact record in Clarity CRM.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Chart */}
        <section className="mb-12">
          <h2 className="text-3xl font-['Archivo'] font-semibold text-center mb-8 text-[#212227]">
            Webhook Event Volume (Sample Data)
          </h2>
          <Card className="rounded-[22px] shadow-lg">
            <CardContent className="p-6">
              <div className="relative w-full h-[300px] md:h-[400px]">
                <canvas ref={chartRef}></canvas>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Security Pillars */}
        <section>
          <h2 className="text-3xl font-['Archivo'] font-semibold text-center mb-8 text-[#212227]">
            Security & Reliability Pillars
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              {
                icon: "🔐",
                title: "Signature Verification",
                desc: "All incoming Shopify webhooks are rigorously verified using HMAC-SHA256 signatures.",
              },
              {
                icon: "🔁",
                title: "Idempotency & Retries",
                desc: "The system uses Create Or Edit logic to prevent duplicate entries with automatic retries.",
              },
              {
                icon: "📈",
                title: "Comprehensive Logging",
                desc: "All webhook activity is meticulously recorded in PostgreSQL for complete observability.",
              },
            ].map((pillar) => (
              <Card key={pillar.title} className="rounded-[22px] shadow-lg">
                <CardContent className="p-8">
                  <div className="text-5xl mb-4">{pillar.icon}</div>
                  <h3 className="text-xl font-['Archivo'] font-semibold text-[#212227]">
                    {pillar.title}
                  </h3>
                  <p className="text-[#696A6D] font-['Vazirmatn'] mt-2 text-sm">
                    {pillar.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
