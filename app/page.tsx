
const categories = [
  { name: "Fresh Vegetables", image: "vegetables.JPG", query: "vegetables" },
  { name: "Grains & Cereals", image: "maize.JPG", query: "grains" },
  { name: "Livestock", image: "cattle.JPG", query: "livestock" },
  { name: "Farm Services", image: "bg.jpg", query: "tractor" },
];

const testimonials = [
  {
    quote:
      "Since I joined AGRIC DSS, my sales have doubled. The escrow system gives me peace of mind knowing I will be paid once I deliver.",
    name: "Samuel Mensah",
    role: "Commercial Maize Farmer",
    image: true,
  },
  {
    quote:
      "As a restaurant owner, sourcing fresh vegetables used to be a headache. Now I buy directly from farmers at great prices. The quality is unmatched!",
    name: "Abigail Osei",
    role: "Restaurant Owner (Buyer)",
    image: false,
  },
  {
    quote:
      "Renting a tractor for land preparation was seamless. The service provider was verified, prompt, and the pricing was very transparent.",
    name: "Kwame Tetteh",
    role: "Smallholder Farmer",
    image: false,
  },
];

export default function HomePage() {
  return (
    <>
      <main>
        <section className="hero">
          <div className="container">
            <div className="row">
              <div className="col-lg-8">
                <div className="hero-content">
                  <span className="hero-tag"><i className="fas fa-leaf me-2" aria-hidden="true" />Next-Gen Agriculture</span>
                  <h1>Empowering the Future of <span>Farming.</span></h1>
                  <p>Connect directly with trusted farmers, procure fresh produce securely, and hire premium agricultural services in one integrated ecosystem.</p>
                  <form action="/marketplace" method="GET" className="hero-search-wrapper">
                    <div className="hero-search glass">
                      <i className="fas fa-search" aria-hidden="true" />
                      <input type="search" name="q" placeholder="Search for fresh maize, tractors, or farmers..." aria-label="Search products, services, or farmers" />
                      <button type="submit" className="btn-glow">Explore Market</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="marquee-section" aria-label="Marketplace benefits">
          <div className="marquee-content">
            {["100% Verified Farmers", "Secure Escrow Payments", "Reliable Transport Network", "Premium Farm Services", "High-Quality Produce", "100% Verified Farmers", "Secure Escrow Payments", "Reliable Transport Network", "Premium Farm Services", "High-Quality Produce"].map((item, index) => (
              <h4 key={`${item}-${index}`}><i className="fas fa-check-circle text-success me-2" aria-hidden="true" />{item}</h4>
            ))}
          </div>
        </div>

        <div className="stats-container container">
          <div className="row g-4 justify-content-center">
            {[
              ["5,000+", "Active Farmers"],
              ["12,000+", "Products Listed"],
              ["99%", "Secure Transactions"],
            ].map(([number, label]) => (
              <div className="col-md-4" key={label}>
                <div className="stat-card"><h3>{number}</h3><p>{label}</p></div>
              </div>
            ))}
          </div>
        </div>

        <section className="about-section">
          <div className="container"><div className="row align-items-center">
            <div className="col-lg-6 position-relative pe-lg-5">
              <div className="about-img-wrapper"><img src="/images/farmer_portrait.png" alt="Proud farmer" /></div>
              <div className="about-badge d-none d-md-flex"><i className="fas fa-shield-alt" aria-hidden="true" /><div><h4>100% Verified</h4><span>Trusted Sellers</span></div></div>
            </div>
            <div className="col-lg-6 about-content mt-5 mt-lg-0">
              <h2>Directly from the Source to You.</h2>
              <p>AGRIC DSS bridges the gap between local farmers and buyers by providing a transparent, secure, and highly efficient digital marketplace. We eliminate the middlemen, ensuring farmers get fair value for their hard work and buyers receive the freshest produce available.</p>
              <p>Whether you need bulk grains for manufacturing, fresh vegetables for your restaurant, or a tractor for land preparation, our platform makes it seamless.</p>
              <div className="d-flex gap-3 mt-4"><a href="/login" className="btn btn-dark btn-glow about-action">Join as Farmer</a><a href="/#categories" className="btn btn-outline-dark about-action">Browse Market</a></div>
            </div>
          </div></div>
        </section>

        <section className="categories-section" id="categories">
          <div className="container">
            <div className="section-header"><h2>Explore Categories</h2><p>Discover a wide range of premium agricultural products and services.</p></div>
            <div className="row g-4">
              {categories.map((category) => (
                <div className="col-lg-3 col-md-6" key={category.name}>
                  <a className="category-card" href={`/marketplace?q=${category.query}`}>
                    <img src={`/images/${category.image}`} alt={category.name} />
                    <span className="category-overlay"><strong>{category.name}</strong><span>View Listings →</span></span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="features-section" id="features">
          <div className="container"><div className="row align-items-center">
            <div className="col-lg-5 mb-5 mb-lg-0"><div className="position-relative"><img src="/images/bg.jpg" alt="Farm landscape" className="features-image" /><div className="trades-badge"><h4>10K+</h4><p>Successful Trades</p></div></div></div>
            <div className="col-lg-6 offset-lg-1">
              <h2 className="features-title">Why Choose AGRIC DSS?</h2>
              <p className="features-intro">We provide the tools, security, and market access you need to trade with absolute confidence.</p>
              <div className="feature-list">
                {[
                  ["fa-handshake", "Dual-Verification System", "Both parties confirm transactions with unique PIN codes, ensuring payment safety and successful deliveries."],
                  ["fa-chart-line", "Real-time Market Prices", "Access up-to-date pricing trends for different commodities, helping you make informed buying decisions."],
                  ["fa-tractor", "Comprehensive Ecosystem", "Rent heavy machinery, request loans, and hire specialized farm labor all in one seamlessly integrated place."],
                ].map(([icon, title, text]) => <div className="d-flex mb-4" key={title}><div className="feature-icon-wrapper"><i className={`fas ${icon}`} aria-hidden="true" /></div><div><h4>{title}</h4><p>{text}</p></div></div>)}
              </div>
            </div>
          </div></div>
        </section>

        <section className="testimonials-section">
          <div className="container">
            <div className="section-header text-center mb-5"><h2>Trusted by Thousands</h2><p>Hear what our community has to say about their experience.</p></div>
            <div className="row g-4">
              {testimonials.map((review) => <div className="col-lg-4 col-md-6" key={review.name}><article className="testimonial-card"><div className="text-warning mb-3" aria-label="5 out of 5 stars">{Array.from({ length: 5 }).map((_, index) => <i className="fas fa-star" key={index} aria-hidden="true" />)}</div><p>“{review.quote}”</p><div className="testimonial-author">{review.image ? <img src="/images/farmer_portrait.png" alt="" /> : <i className="fas fa-user-circle text-secondary testimonial-avatar" aria-hidden="true" />}<div><h5>{review.name}</h5><span>{review.role}</span></div></div></article></div>)}
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="container cta-container-inner"><div className="row justify-content-center"><div className="col-lg-7 col-md-9"><div className="cta-content-wrapper">
            <div className="cta-images"><img src="/images/vegetables.JPG" alt="Fresh vegetables" /><img src="/images/cattle.JPG" alt="Cattle" /><img src="/images/maize.JPG" alt="Maize" /></div>
            <h2>Ready to transform your agricultural business?</h2>
            <p>Join thousands of verified farmers and buyers experiencing the future of agricultural trading today.</p>
            <a href="/login" className="btn-cta btn-glow">Get Started for Free</a>
          </div></div></div></div>
        </section>
      </main>

      <footer className="fat-footer">
        <div className="container"><div className="row g-5">
          <div className="col-lg-4 col-md-6"><a href="/" className="footer-brand"><i className="fas fa-wheat-awn text-success" aria-hidden="true" /> AGRIC DSS</a><p className="footer-description">The ultimate digital marketplace bridging the gap between farmers, buyers, and agricultural service providers.</p><div className="footer-socials"><a href="#" aria-label="Facebook"><i className="fab fa-facebook-f" /></a><a href="#" aria-label="X"><i className="fa-brands fa-x-twitter" /></a><a href="#" aria-label="Instagram"><i className="fab fa-instagram" /></a><a href="#" aria-label="LinkedIn"><i className="fab fa-linkedin-in" /></a></div></div>
          <div className="col-lg-2 col-md-6"><h5>Quick Links</h5><ul className="footer-links"><li><a href="/#categories">Marketplace</a></li><li><a href="/login">Sell Produce</a></li><li><a href="/#features">Farm Services</a></li><li><a href="/login">Agric Loans</a></li></ul></div>
          <div className="col-lg-2 col-md-6"><h5>Support</h5><ul className="footer-links"><li><a href="#">Help Center</a></li><li><a href="#">Safety Center</a></li><li><a href="#">Community Guidelines</a></li><li><a href="#">Contact Us</a></li></ul></div>
          <div className="col-lg-4 col-md-6"><h5>Subscribe to Newsletter</h5><p>Get the latest market prices and platform updates delivered to your inbox.</p><form className="footer-newsletter"><input type="email" placeholder="Your Email Address" required /><button type="button">Subscribe Now</button></form></div>
        </div><div className="footer-bottom"><p>© {new Date().getFullYear()} AGRIC DSS. All rights reserved. | <a href="#">Privacy Policy</a> | <a href="#">Terms of Service</a></p></div></div>
      </footer>
      <div className="fab-container"><a href="https://wa.me/1234567890" target="_blank" rel="noreferrer" className="floating-btn" title="Chat with Support" aria-label="Chat with support on WhatsApp"><i className="fab fa-whatsapp" aria-hidden="true" /></a></div>
    </>
  );
}
