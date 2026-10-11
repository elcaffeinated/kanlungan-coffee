import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import {
  getCustomers,
  getProducts,
  productImage,
  sendMessage,
  sendOrder,
} from "./api"
import type { Customer, MenuItem } from "./api"
import cafeInterior from "./assets/cafe-interior.jpg"
import peopleAtCafe from "./assets/cafe-community.jpg"
import icedCoffee from "./assets/iced-coffee.jpg"
import warmCafe from "./assets/warm-cafe.jpg"
import footerLogo from "./assets/kanlungan-logo-light.png"

function ArrowUpRight({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 17 17 7M8 7h9v9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Logo({ light = false }: { light?: boolean }) {
  const file = light ? "kanlungan-logo-light.png" : "kanlungan-logo.png"
  return (
    <a
      href="#home"
      className={`logo ${light ? "logo-light" : ""}`}
      aria-label="Kanlungan Coffee home"
    >
      <img
        src={`${import.meta.env.BASE_URL}${file}`}
        alt="Kanlungan Coffee"
        className="logo-image"
      />
    </a>
  )
}

const storyItems = [
  {
    number: "01",
    label: "Who we are",
    title: "Your go-to café for all occasions.",
    text: "Whether you're looking for a place to study, catch up with friends, spend quality time with loved ones, or simply enjoy a little moment for yourself, we've got a spot for you. We believe a café should feel welcoming, comfortable, and at home. At Kanlungan Coffee, there's always room for you.",
  },
  {
    number: "02",
    label: "What we offer",
    title: "Affordable cravings, made delightful.",
    text: "From your favorite coffee and non-coffee beverages to refreshing drinks and beloved Filipino classics, there's something for everyone. Pair your drink with pastries and treats—whether you're after something trendy or a taste that feels like home, we've got you covered without breaking the bank.",
  },
  {
    number: "03",
    label: "Our purpose",
    title: "A space to connect, unwind, and belong.",
    text: "We make quality drinks and comforting treats accessible, especially for students looking to relax or spend time productively. By bringing familiar local flavors into the modern café experience, we celebrate Filipino culture and build a community where everyone feels they belong.",
  },
]

const offerings = [
  {
    icon: "01",
    title: "Coffee & classics",
    text: "Espresso favorites, local flavors, and your everyday comfort cup.",
  },
  {
    icon: "02",
    title: "Cool & refreshing",
    text: "Creamy, fruity, and non-coffee drinks made for tropical afternoons.",
  },
  {
    icon: "03",
    title: "Treats & pastries",
    text: "Fresh, satisfying bites that pair perfectly with your drink.",
  },
]

const experiences = [
  {
    label: "Services",
    title: "Fast Wi-Fi & study-ready tables",
    detail:
      "Settle in with free Wi-Fi, charging access, and tables made for solo focus or group work.",
  },
  {
    label: "Events",
    title: "Open mic nights & community pop-ups",
    detail:
      "Catch student performers, local makers, and special café nights throughout the month.",
  },
  {
    label: "Features",
    title: "Student pricing & cozy corners",
    detail:
      "Bring a valid school ID for food discounts, then find your favorite sunny seat or quiet nook.",
  },
  {
    label: "Organizations",
    title: "Campus org-friendly space",
    detail:
      "Ask us about table reservations, small gatherings, and collaborations for your next org activity.",
  },
  {
    label: "Activities",
    title: "Study sessions & creative meetups",
    detail:
      "From review sessions to sketch dates, our flexible spaces are ready for whatever you are making.",
  },
]

// Shows the product photo; if the file is missing, falls back to the letter art.
function MenuCardArt({ item }: { item: MenuItem }) {
  const [failed, setFailed] = useState(false)
  return (
    <div
      className={`menu-card-art art-${item.category.toLowerCase().replace("-", "")} ${failed ? "" : "has-photo"}`}
    >
      {failed ? (
        <span aria-hidden="true">
          {item.category === "Coffee"
            ? "K"
            : item.category === "Food"
              ? "T"
              : "R"}
        </span>
      ) : (
        <img
          src={productImage(item)}
          alt={item.name}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
      {item.badge && <small>{item.badge}</small>}
    </div>
  )
}

function formatMonth(value: string) {
  const date = new Date(`${value}-01T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-PH", { month: "short", year: "numeric" })
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState("All")
  const [activeSection, setActiveSection] = useState("home")
  const [openStory, setOpenStory] = useState(0)
  const [activeExperience, setActiveExperience] = useState(0)
  const [announcement, setAnnouncement] = useState("")
  const [cart, setCart] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem("kanlungan-cart") || "{}")
    } catch {
      return {}
    }
  })
  const [cartOpen, setCartOpen] = useState(false)
  const [orderComplete, setOrderComplete] = useState(false)
  const [messageSent, setMessageSent] = useState(false)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuStatus, setMenuStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  )
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customersStatus, setCustomersStatus] = useState<
    "loading" | "ready" | "error"
  >("loading")
  const [orderCode, setOrderCode] = useState("")
  const [orderError, setOrderError] = useState("")
  const [messageError, setMessageError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [studentDiscount, setStudentDiscount] = useState(
    () => localStorage.getItem("kanlungan-student-discount") === "true",
  )

  useEffect(() => {
    // GET the two datasets (products + customers) when the page loads
    const controller = new AbortController()
    getProducts(controller.signal)
      .then((items) => {
        setMenuItems(items)
        setMenuStatus("ready")
      })
      .catch((error) => {
        if (error.name !== "AbortError") setMenuStatus("error")
      })
    getCustomers(controller.signal)
      .then((data) => {
        setCustomers(data)
        setCustomersStatus("ready")
      })
      .catch((error) => {
        if (error.name !== "AbortError") setCustomersStatus("error")
      })
    return () => controller.abort()
  }, [])

  const closeMenu = () => setMenuOpen(false)
  const filteredItems =
    activeCategory === "All"
      ? menuItems
      : menuItems.filter((item) => item.category === activeCategory)
  const cartCount = menuItems.reduce(
    (sum, item) => sum + (cart[item.id] || 0),
    0,
  )
  const cartSubtotal = menuItems.reduce(
    (sum, item) => sum + item.price * (cart[item.id] || 0),
    0,
  )
  const discountAmount = studentDiscount
    ? Math.round(
        menuItems
          .filter((item) => item.category === "Food")
          .reduce((sum, item) => sum + item.price * (cart[item.id] || 0), 0) *
          0.2,
      )
    : 0
  const cartTotal = cartSubtotal - discountAmount
  const addToCart = (id: string) => {
    if (menuItems.find((item) => item.id === id)?.available === false) return
    setCart((current) => ({ ...current, [id]: (current[id] || 0) + 1 }))
    setOrderComplete(false)
    const item = menuItems.find((menuItem) => menuItem.id === id)
    setAnnouncement(`${item?.name || "Item"} added to your order`)
  }
  const updateCart = (id: string, change: number) => {
    setCart((current) => {
      const quantity = Math.max(0, (current[id] || 0) + change)
      const next = { ...current }
      if (quantity === 0) delete next[id]
      else next[id] = quantity
      return next
    })
  }
  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSubmitting(true)
    setOrderError("")
    try {
      const summary = menuItems
        .filter((item) => cart[item.id])
        .map(
          (item) =>
            `${cart[item.id]} x ${item.name} (₱${item.price * cart[item.id]})`,
        )
        .join("\n")
      const code = await sendOrder({
        items: cart,
        studentDiscount,
        pickupName: String(form.get("pickupName") || ""),
        mobile: String(form.get("mobile") || ""),
        note: String(form.get("note") || ""),
        summary,
        total: cartTotal,
      })
      setOrderCode(code)
      setOrderComplete(true)
      setCart({})
    } catch (error) {
      setOrderError(
        error instanceof Error ? error.message : "Could not place your order.",
      )
    } finally {
      setSubmitting(false)
    }
  }
  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setSubmitting(true)
    setMessageError("")
    try {
      await sendMessage({
        name: String(form.get("name") || ""),
        email: String(form.get("email") || ""),
        topic: String(form.get("topic") || ""),
        message: String(form.get("message") || ""),
      })
      setMessageSent(true)
      formElement.reset()
    } catch (error) {
      setMessageError(
        error instanceof Error ? error.message : "Could not send your message.",
      )
    } finally {
      setSubmitting(false)
    }
  }
  const exploreCategory = (category: string) => {
    setActiveCategory(category)
    document.querySelector("#full-menu")?.scrollIntoView({ behavior: "smooth" })
  }
  const claimStudentDiscount = () => {
    setStudentDiscount(true)
    setActiveCategory("Food")
    setAnnouncement("Student discount added. Show your school ID at pickup.")
    document.querySelector("#full-menu")?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    const closeOverlays = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCartOpen(false)
        setMenuOpen(false)
      }
    }

    document.addEventListener("keydown", closeOverlays)
    document.body.style.overflow = cartOpen ? "hidden" : ""

    return () => {
      document.removeEventListener("keydown", closeOverlays)
      document.body.style.overflow = ""
    }
  }, [cartOpen])

  useEffect(() => {
    localStorage.setItem("kanlungan-cart", JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    localStorage.setItem("kanlungan-student-discount", String(studentDiscount))
  }, [studentDiscount])

  useEffect(() => {
    const sections = ["home", "about", "menu", "full-menu", "contact"]
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section))
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActiveSection(visible.target.id)
      },
      { rootMargin: "-25% 0px -60%", threshold: [0, 0.2, 0.5] },
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!announcement) return
    const timeout = window.setTimeout(() => setAnnouncement(""), 2600)
    return () => window.clearTimeout(timeout)
  }, [announcement])

  return (
    <div className="site-shell">
      <header className="topbar">
        <Logo />
        <nav
          className={`nav-links ${menuOpen ? "is-open" : ""}`}
          aria-label="Main navigation"
        >
          <a
            href="#home"
            className={activeSection === "home" ? "active" : ""}
            aria-current={activeSection === "home" ? "page" : undefined}
            onClick={closeMenu}
          >
            Home
          </a>
          <a
            href="#full-menu"
            className={
              activeSection === "menu" || activeSection === "full-menu"
                ? "active"
                : ""
            }
            aria-current={
              activeSection === "menu" || activeSection === "full-menu"
                ? "page"
                : undefined
            }
            onClick={closeMenu}
          >
            Menu
          </a>
          <a
            href="#about"
            className={activeSection === "about" ? "active" : ""}
            aria-current={activeSection === "about" ? "page" : undefined}
            onClick={closeMenu}
          >
            About
          </a>
          <a
            href="#contact"
            className={activeSection === "contact" ? "active" : ""}
            aria-current={activeSection === "contact" ? "page" : undefined}
            onClick={closeMenu}
          >
            Contact
          </a>
          <a href="#full-menu" className="nav-cta" onClick={closeMenu}>
            View menu <ArrowUpRight size={16} />
          </a>
        </nav>
        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-copy">
            <div className="eyebrow">
              <span /> Your neighborhood coffee nook
            </div>
            <h1>
              A little place to <em>feel at home.</em>
            </h1>
            <p className="hero-tagline">
              “A student-friendly cafe? Sagot na namin ‘yan!”
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#full-menu">
                Check our affordable menu <ArrowUpRight />
              </a>
              <a className="text-link" href="#about">
                Discover our story <span>↓</span>
              </a>
            </div>
            <div className="hero-proof">
              <div className="avatar-stack" aria-hidden="true">
                <span>JM</span>
                <span>AK</span>
                <span>LY</span>
              </div>
              <p>
                <strong>Made for every moment</strong>
                <br />
                Study. Tambay. Sip. Repeat.
              </p>
            </div>
          </div>
          <div className="hero-visual">
            <img
              src={cafeInterior}
              alt="Warm and inviting modern coffee shop interior"
              fetchPriority="high"
            />
            <div className="hero-stamp">
              <span>Est.</span>
              <strong>2025</strong>
              <small>Made with puso</small>
            </div>
            <div className="hero-note">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M6 9h10v5a5 5 0 0 1-5 5 5 5 0 0 1-5-5V9Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16M9 5c0-1 1-1.2 1-2.2M13 5c0-1 1-1.2 1-2.2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <span>
                <strong>Good coffee.</strong>
                <br />
                Better company.
              </span>
            </div>
          </div>
          <div className="scroll-cue">
            <span>Scroll to explore</span>
            <i />
          </div>
        </section>

        <section className="welcome-strip" aria-label="Brand values">
          <span>Abot-kaya</span>
          <i>✦</i>
          <span>Gawang may puso</span>
          <i>✦</i>
          <span>Para sa lahat</span>
          <i>✦</i>
          <span>Laging may puwang</span>
        </section>

        <section className="about section" id="about">
          <div className="section-heading">
            <div>
              <p className="kicker">About Kanlungan</p>
              <h2>
                More than coffee.
                <br />
                <em>It's your space.</em>
              </h2>
            </div>
            <p className="heading-intro">
              “Kanlungan” means shelter—a safe place to pause, connect, and be
              yourself. That feeling is poured into everything we do.
            </p>
          </div>

          <div className="story-layout">
            <div className="story-image">
              <img
                src={peopleAtCafe}
                alt="Friends connecting inside a cozy cafe"
                loading="lazy"
              />
              <blockquote>
                “There’s always
                <br />
                room for you.”
              </blockquote>
            </div>
            <div className="story-list">
              {storyItems.map((item, index) => (
                <article
                  className={`story-item ${
                    openStory === index ? "is-open" : ""
                  }`}
                  key={item.number}
                >
                  <span className="story-number">{item.number}</span>
                  <div>
                    <p className="story-label">{item.label}</p>
                    <button
                      className="story-trigger"
                      type="button"
                      aria-expanded={openStory === index}
                      aria-controls={`story-${index}`}
                      onClick={() =>
                        setOpenStory((current) =>
                          current === index ? -1 : index,
                        )
                      }
                    >
                      <span>{item.title}</span>
                      <i aria-hidden="true">+</i>
                    </button>
                    <div
                      className="story-answer"
                      id={`story-${index}`}
                      aria-hidden={openStory !== index}
                    >
                      <p>{item.text}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="origin">
          <div className="origin-copy">
            <p className="kicker kicker-light">Our beginning</p>
            <h2>
              From one student dream to <em>everyone’s kanlungan.</em>
            </h2>
            <p>
              Kanlungan Coffee started with a simple dream shared by a group of
              students who wanted to turn their passion into something
              meaningful—a café where Filipino comfort meets today’s café
              culture.
            </p>
            <p>
              We created an affordable go-to spot for students who deserve a
              cozy place to study, hang out, and enjoy good food and drinks
              without stretching their budgets. Because you don’t have to spend
              a lot to feel at home.
            </p>
            <div className="origin-quote">
              Every cup should feel like a little kanlungan.
            </div>
          </div>
          <div className="origin-image">
            <img
              src={icedCoffee}
              alt="Iced coffee served in a warm cafe setting"
              loading="lazy"
            />
          </div>
        </section>

        <section className="offerings section" id="menu">
          <div className="section-heading offerings-heading">
            <div>
              <p className="kicker">Made for your mood</p>
              <h2>
                Something good,
                <br />
                <em>whatever you crave.</em>
              </h2>
            </div>
            <a className="button button-outline" href="#full-menu">
              Explore the full menu <ArrowUpRight />
            </a>
          </div>
          <div className="offering-grid">
            {offerings.map((offering, index) => (
              <article className="offering-card" key={offering.title}>
                <span>{offering.icon}</span>
                <div className="offering-icon" aria-hidden="true">
                  {offering.icon === "01"
                    ? "K"
                    : offering.icon === "02"
                      ? "R"
                      : "T"}
                </div>
                <h3>{offering.title}</h3>
                <p>{offering.text}</p>
                <button
                  type="button"
                  onClick={() =>
                    exploreCategory(
                      index === 0
                        ? "Coffee"
                        : index === 1
                          ? "Non-coffee"
                          : "Food",
                    )
                  }
                  aria-label={`See ${offering.title}`}
                >
                  <ArrowUpRight />
                </button>
              </article>
            ))}
          </div>

          <div className="experience-panel">
            <div className="experience-title">
              <p className="kicker kicker-light">Beyond the cup</p>
              <h3>
                A café that fits
                <br />
                into your day.
              </h3>
            </div>
            <div className="experience-list">
              {experiences.map((experience, index) => (
                <button
                  type="button"
                  className={activeExperience === index ? "active" : ""}
                  aria-expanded={activeExperience === index}
                  aria-controls={`experience-${index}`}
                  onClick={() =>
                    setActiveExperience((current) =>
                      current === index ? -1 : index,
                    )
                  }
                  key={experience.label}
                >
                  <span>{experience.label}</span>
                  <strong>{experience.title}</strong>
                  <ArrowUpRight size={17} />
                  <small id={`experience-${index}`}>{experience.detail}</small>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="full-menu section" id="full-menu">
          <div className="menu-header">
            <div>
              <p className="kicker">The Kanlungan menu</p>
              <h2>
                Comfort in
                <br />
                <em>every order.</em>
              </h2>
            </div>
            <div className="menu-intro">
              <p>
                Thoughtfully made, student-budget friendly, and always
                satisfying. Available hot or iced unless noted.
              </p>
              <button
                className="basket-button"
                type="button"
                onClick={() => setCartOpen(true)}
              >
                <span>My order</span>
                <strong>{cartCount}</strong>
              </button>
            </div>
          </div>
          <div
            className="menu-filters"
            role="group"
            aria-label="Filter menu by category"
          >
            {["All", "Coffee", "Non-coffee", "Food"].map((category) => (
              <button
                type="button"
                className={activeCategory === category ? "active" : ""}
                onClick={() => setActiveCategory(category)}
                key={category}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="menu-grid">
            {menuStatus === "loading" && (
              <p className="data-note" role="status">
                Loading our menu…
              </p>
            )}
            {menuStatus === "error" && (
              <p className="data-note" role="alert">
                We couldn’t load the menu right now. Please refresh the page or
                try again in a moment.
              </p>
            )}
            {filteredItems.map((item) => (
              <article
                className={`menu-card ${item.available ? "" : "sold-out"}`}
                key={item.id}
              >
                <MenuCardArt item={item} />
                <div className="menu-card-copy">
                  <div>
                    <span>{item.category}</span>
                    <h3>{item.name}</h3>
                  </div>
                  <strong>₱{item.price}</strong>
                  <p>{item.description}</p>
                  <span
                    className={`availability ${item.available ? "in-stock" : "out"}`}
                  >
                    {item.available ? "Available today" : "Sold out"}
                  </span>
                  <button
                    type="button"
                    disabled={!item.available}
                    onClick={() => addToCart(item.id)}
                  >
                    {!item.available
                      ? "Unavailable"
                      : cart[item.id]
                        ? `Add another · ${cart[item.id]} in order`
                        : "Add to order"}{" "}
                    <span>+</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
          <p className="menu-note">
            Prices are inclusive of VAT. Please let our team know about any food
            allergies before ordering.
          </p>
        </section>

        <section className="promo" aria-label="Student discount promotion">
          <img src={warmCafe} alt="" loading="lazy" />
          <div className="promo-overlay" />
          <div className="promo-content">
            <div className="discount-badge">
              <strong>20%</strong>
              <span>
                student
                <br />
                discount
              </span>
            </div>
            <p className="kicker kicker-light">Exclusive student perk</p>
            <h2>
              Student ka?
              <br />
              <em>Avail mo na ’to!</em>
            </h2>
            <p>
              Get 20% off all food menu items. Just present your valid school ID
              at the counter and enjoy more for less.
            </p>
            <button
              className="button button-cream"
              type="button"
              onClick={claimStudentDiscount}
            >
              {studentDiscount
                ? "Student discount added"
                : "Claim your student treat"}{" "}
              <ArrowUpRight />
            </button>
            <small>Valid for dine-in orders. Terms and conditions apply.</small>
          </div>
        </section>

        <section
          className="customers section"
          id="regulars"
          aria-labelledby="regulars-title"
        >
          <div className="section-heading">
            <div>
              <p className="kicker">Kanlungan regulars</p>
              <h2 id="regulars-title">
                Heard from
                <br />
                <em>our regulars.</em>
              </h2>
            </div>
            <p className="heading-intro">
              Students, orgs, and freelancers who made Kanlungan their second
              home.
            </p>
          </div>
          {customersStatus === "loading" && (
            <p className="data-note" role="status">
              Loading stories…
            </p>
          )}
          {customersStatus === "error" && (
            <p className="data-note" role="alert">
              We couldn’t load customer stories right now.
            </p>
          )}
          {customersStatus === "ready" && (
            <div className="customer-grid">
              {customers.map((customer) => {
                const favorite = menuItems.find(
                  (item) => item.id === customer.favoriteItem,
                )
                return (
                  <article className="customer-card" key={customer.id}>
                    <div
                      className="customer-rating"
                      role="img"
                      aria-label={`${customer.rating} out of 5 stars`}
                    >
                      {"★".repeat(customer.rating)}
                      {"☆".repeat(5 - customer.rating)}
                    </div>
                    <blockquote>“{customer.quote}”</blockquote>
                    <div className="customer-meta">
                      <span className="customer-avatar" aria-hidden="true">
                        {customer.name.charAt(0)}
                      </span>
                      <div>
                        <strong>{customer.name}</strong>
                        <span>{customer.role}</span>
                      </div>
                    </div>
                    <dl className="customer-stats">
                      <div>
                        <dt>Regular since</dt>
                        <dd>{formatMonth(customer.memberSince)}</dd>
                      </div>
                      <div>
                        <dt>Visits / week</dt>
                        <dd>{customer.visitsPerWeek}</dd>
                      </div>
                      {favorite && (
                        <div>
                          <dt>Usual order</dt>
                          <dd>{favorite.name}</dd>
                        </div>
                      )}
                    </dl>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="contact-section section" id="contact">
          <div className="contact-info">
            <p className="kicker">Come home to Kanlungan</p>
            <h2>
              Let’s share a<br />
              <em>cup sometime.</em>
            </h2>
            <p>
              Questions, group reservations, campus collaborations, or simply
              want to say hello? Send us a message and our team will get back to
              you.
            </p>
            <div className="contact-details">
              <a
                href="https://www.google.com/maps/search/?api=1&query=Student+District+Quezon+City"
                target="_blank"
                rel="noreferrer"
              >
                <span>Visit</span>
                <strong>
                  Student District, Quezon City
                  <br />
                  Metro Manila, Philippines
                </strong>
                <ArrowUpRight size={16} />
              </a>
              <div>
                <span>Hours</span>
                <strong>
                  Monday–Sunday
                  <br />
                  8:00 AM–10:00 PM
                </strong>
              </div>
              <div>
                <span>Contact</span>
                <strong>
                  <a href="mailto:hello@kanlungancoffee.ph">
                    hello@kanlungancoffee.ph
                  </a>
                  <br />
                  <a href="tel:+639171234567">+63 917 123 4567</a>
                </strong>
              </div>
            </div>
          </div>
          <div className="contact-form-wrap">
            {messageSent ? (
              <div className="form-success" role="status">
                <span>✓</span>
                <h3>Salamat!</h3>
                <p>Your message is on its way. We’ll get back to you soon.</p>
                <button type="button" onClick={() => setMessageSent(false)}>
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={submitMessage}>
                <div className="field-row">
                  <label>
                    <span>Your name</span>
                    <input
                      name="name"
                      type="text"
                      placeholder="Juan Dela Cruz"
                      required
                    />
                  </label>
                  <label>
                    <span>Email address</span>
                    <input
                      name="email"
                      type="email"
                      placeholder="juan@email.com"
                      required
                    />
                  </label>
                </div>
                <label>
                  <span>What can we help with?</span>
                  <select name="topic" defaultValue="">
                    <option value="" disabled>
                      Select a topic
                    </option>
                    <option>General inquiry</option>
                    <option>Group reservation</option>
                    <option>Campus collaboration</option>
                    <option>Feedback</option>
                  </select>
                </label>
                <label>
                  <span>Your message</span>
                  <textarea
                    name="message"
                    rows={5}
                    placeholder="Tell us more..."
                    required
                  />
                </label>
                {messageError && (
                  <p className="form-error" role="alert">
                    {messageError}
                  </p>
                )}
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? "Sending…" : "Send message"} <ArrowUpRight />
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      <div className={`toast ${announcement ? "visible" : ""}`} role="status">
        <span aria-hidden="true">✓</span>
        {announcement}
      </div>

      {cartCount > 0 && !cartOpen && (
        <button
          className="floating-cart"
          type="button"
          onClick={() => setCartOpen(true)}
        >
          <span>View order</span>
          <strong>
            {cartCount} item{cartCount === 1 ? "" : "s"} · ₱{cartTotal}
          </strong>
        </button>
      )}

      <div
        className={`cart-backdrop ${cartOpen ? "visible" : ""}`}
        onClick={() => setCartOpen(false)}
      />
      <aside
        className={`cart-drawer ${cartOpen ? "visible" : ""}`}
        aria-label="Your order"
        aria-hidden={!cartOpen}
        aria-modal="true"
        role="dialog"
      >
        <div className="cart-heading">
          <div>
            <p>Your order</p>
            <h2>Pickup basket</h2>
          </div>
          <button
            type="button"
            aria-label="Close order basket"
            onClick={() => setCartOpen(false)}
          >
            ×
          </button>
        </div>
        {orderComplete ? (
          <div className="order-success" role="status">
            <span>✓</span>
            <h3>Order received!</h3>
            <p>
              We’re preparing your order. Please show your confirmation at the
              counter in around 15–20 minutes.
            </p>
            {orderCode && (
              <p className="order-code">
                Order code: <strong>{orderCode}</strong>
              </p>
            )}
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                setOrderComplete(false)
                setCartOpen(false)
              }}
            >
              Done
            </button>
          </div>
        ) : cartCount === 0 ? (
          <div className="empty-cart">
            <span className="empty-mark" aria-hidden="true">
              K
            </span>
            <h3>Your basket is empty</h3>
            <p>Add a drink or snack from our menu to begin your order.</p>
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                setCartOpen(false)
                document.querySelector("#full-menu")?.scrollIntoView()
              }}
            >
              Browse menu
            </button>
          </div>
        ) : (
          <form className="cart-form" onSubmit={submitOrder}>
            <div className="cart-items">
              {menuItems
                .filter((item) => cart[item.id])
                .map((item) => (
                  <div className="cart-item" key={item.id}>
                    <div>
                      <h3>{item.name}</h3>
                      <span>₱{item.price} each</span>
                    </div>
                    <div className="quantity-control">
                      <button
                        type="button"
                        onClick={() => updateCart(item.id, -1)}
                        aria-label={`Remove one ${item.name}`}
                      >
                        −
                      </button>
                      <strong>{cart[item.id]}</strong>
                      <button
                        type="button"
                        onClick={() => updateCart(item.id, 1)}
                        aria-label={`Add one ${item.name}`}
                      >
                        +
                      </button>
                    </div>
                    <strong>₱{item.price * cart[item.id]}</strong>
                  </div>
                ))}
            </div>
            <div className="pickup-fields">
              <label>
                <span>Pickup name</span>
                <input name="pickupName" required placeholder="Your name" />
              </label>
              <label>
                <span>Mobile number</span>
                <input
                  name="mobile"
                  required
                  type="tel"
                  placeholder="09XX XXX XXXX"
                />
              </label>
              <label>
                <span>
                  Order note <small>(optional)</small>
                </span>
                <input name="note" placeholder="Less ice, no sugar..." />
              </label>
            </div>
            <div className="cart-total">
              <span>
                {discountAmount > 0 && (
                  <small>
                    Subtotal ₱{cartSubtotal} · Student discount −₱
                    {discountAmount}
                  </small>
                )}
                Total
              </span>
              <strong>₱{cartTotal}</strong>
            </div>
            {orderError && (
              <p className="form-error" role="alert">
                {orderError}
              </p>
            )}
            <button
              className="button button-primary checkout-button"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Placing order…" : "Place pickup order"}{" "}
              <ArrowUpRight />
            </button>
            <small className="pay-note">
              Pay at the counter when you collect your order.
            </small>
          </form>
        )}
      </aside>

          <footer>
        <div className="footer-main">
          <div className="footer-brand">
            <a href="#home" aria-label="Kanlungan Coffee home">
              <img
                src={footerLogo}
                alt="Kanlungan Coffee"
                className="footer-logo"
              />
            </a>
            <p>
              Your cozy corner for good coffee, familiar flavors, and even
              better moments.
            </p>
          </div>
          <div className="footer-column">
            <p>Explore</p>
            <a href="#home">Home</a>
            <a href="#full-menu">Our menu</a>
            <a href="#about">Our story</a>
          </div>
          <div className="footer-column">
            <p>Visit us</p>
            <span>Open daily</span>
            <span>8:00 AM — 10:00 PM</span>
            <a href="mailto:hello@kanlungancoffee.ph">
              hello@kanlungancoffee.ph
            </a>
          </div>
          <div className="footer-newsletter">
            <p>Fresh from Kanlungan</p>
            <span>
              Follow our socials for new drinks, promos, and café happenings.
            </span>
            <div className="socials">
              <a
                href="https://www.instagram.com/kanlungan.coffee?dlrf=cGlud2Q4bmQ3NTBw&utm_source=qr"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
              >
                ig
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61595102677561"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
              >
                fb
              </a>
              <a
                href="https://www.tiktok.com/@kanlungan.coffee?_r=1&_t=ZS-9AQtmG6FKxI"
                target="_blank"
                rel="noreferrer"
                aria-label="TikTok"
              >
                tk
              </a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2025 Kanlungan Coffee Co.</span>
          <span>Made with Love in the Philippines.</span>
        </div>
      </footer>
    </div>
  )
}