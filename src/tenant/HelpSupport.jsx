import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, CheckCircle, HelpCircle, MessageCircle, Send } from "lucide-react";
const faqItems = [
  {
    question: "How do apartment preferences work?",
    answer:
      "Your saved preferences are used to personalize Recommended Apartments. These may include your preferred location, budget, bedroom preference, and selected amenities.",
  },
  {
    question: "How do I save an apartment to Favorites?",
    answer:
      "Tap the heart icon on an apartment card or listing details page. You can view all saved apartments from My Favorites.",
  },
  {
    question: "Why are room prices different?",
    answer:
      "Each room may have its own monthly rental price depending on room type, capacity, amenities, and other property details provided by the landlord.",
  },
  {
    question: "What does the verified badge mean?",
    answer:
      "A verified badge means the submitted listing documents were reviewed by an administrator. It does not guarantee ownership, safety, or legal compliance.",
  },
  {
    question: "How do I report an apartment listing?",
    answer:
      "Open the apartment listing and use Report a Problem. You can report inaccurate information, suspicious listings, or unavailable apartments.",
  },
  {
    question: "Where can I check updates about my report?",
    answer:
      "Open Notifications to check updates after an administrator reviews or resolves your report.",
  },
  {
    question: "How can I update my account settings?",
    answer:
      "Open Settings from the tenant navigation to update the account and preference options available to your profile.",
  },
];

export const HelpSupport = ({
  supportSubmitted,
  setSupportSubmitted,
  supportForm,
  setSupportForm,
  handleSupportSubmit,
  isSubmittingSupport,
}) => {
  const [openFaq, setOpenFaq] = useState(0);

  const toggleFaq = (index) => {
    setOpenFaq((current) => (current === index ? null : index));
  };

  return (
    <div className="tenant-help-page">
      <header className="tenant-help-header">
        <div>
          <h1 className="tenant-help-title">Help</h1>
          <p className="tenant-help-subtitle">
            Find answers and guidance for using AptFindr.
          </p>
        </div>
      </header>

      <Card className="tenant-help-faq-card">
        <CardHeader>
          <CardTitle className="tenant-help-card-title">
            <HelpCircle />
            Frequently Asked Questions
          </CardTitle>

          <CardDescription>
            Common questions about using AptFindr as a tenant.
          </CardDescription>
        </CardHeader>

        <CardContent className="tenant-help-faq-list">
          {faqItems.map((item, index) => {
            const isOpen = openFaq === index;

            return (
              <div
                key={item.question}
                className={`tenant-help-faq-item ${
                  isOpen ? "tenant-help-faq-item-open" : ""
                }`}
              >
                <button
                  type="button"
                  className="tenant-help-faq-question"
                  onClick={() => toggleFaq(index)}
                  aria-expanded={isOpen}
                >
                  <span>{item.question}</span>

                  <ChevronDown
                    className={`tenant-help-faq-chevron ${
                      isOpen ? "tenant-help-faq-chevron-open" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="tenant-help-faq-answer">
                    <p>{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="tenant-help-support-card">
        <CardHeader>
          <CardTitle className="tenant-help-card-title">
            <MessageCircle />
            Contact Support
          </CardTitle>

          <CardDescription>
            If your question was not answered above, send a support request.
          </CardDescription>
        </CardHeader>

        <CardContent className="tenant-help-support-content">
          {supportSubmitted ? (
            <div className="tenant-help-success">
              <CheckCircle className="tenant-help-success-icon" />

              <p className="tenant-help-success-title">
                Support request received
              </p>

              <p className="tenant-help-success-text">
                Our team will review your concern and contact you using the
                details provided.
              </p>

              <Button
                type="button"
                onClick={() => setSupportSubmitted(false)}
              >
                Send Another Request
              </Button>
            </div>
          ) : (
            <>
              <div className="tenant-help-form-grid">
                <div className="tenant-help-field">
                  <Label htmlFor="support-topic">Topic</Label>

                  <select
                    id="support-topic"
                    value={supportForm.topic}
                    onChange={(event) =>
                      setSupportForm((current) => ({
                        ...current,
                        topic: event.target.value,
                      }))
                    }
                    className="tenant-help-select"
                  >
                    <option value="">Choose a topic...</option>
                    <option value="Account or login">
                      Account or login
                    </option>
                    <option value="Search and filters">
                      Search and filters
                    </option>
                    <option value="Favorites">
                      Favorites
                    </option>
                    <option value="Contacting landlord">
                      Contacting landlord
                    </option>
                    <option value="Other">
                      Other
                    </option>
                  </select>
                </div>

                <div className="tenant-help-field">
                  <Label htmlFor="support-contact">
                    Email or phone number
                  </Label>

                  <Input
                    id="support-contact"
                    type="text"
                    value={supportForm.contact}
                    onChange={(event) =>
                      setSupportForm((current) => ({
                        ...current,
                        contact: event.target.value,
                      }))
                    }
                    placeholder="Enter your email or phone number"
                  />
                </div>
              </div>

              <div className="tenant-help-field">
                <div className="tenant-help-message-header">
                  <Label htmlFor="support-message">
                    Message
                  </Label>

                  <span>
                    {supportForm.message.length}/500
                  </span>
                </div>

                <textarea
                  id="support-message"
                  rows={5}
                  maxLength={500}
                  value={supportForm.message}
                  onChange={(event) =>
                    setSupportForm((current) => ({
                      ...current,
                      message: event.target.value,
                    }))
                  }
                  placeholder="Tell us what happened or what you need help with..."
                  className="tenant-help-textarea"
                />
              </div>

              <Button
                type="button"
                onClick={() => void handleSupportSubmit()}
                disabled={isSubmittingSupport}
                className="tenant-help-submit"
              >
                <Send />

                {isSubmittingSupport
                  ? "Sending..."
                  : "Send Support Request"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
