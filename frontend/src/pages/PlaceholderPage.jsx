function PlaceholderPage({ title, description }) {
  return (
    <section>
      <p
        style={{
          marginBottom: "7px",
          color: "var(--color-primary)",
          fontSize: "11px",
          fontWeight: "700",
          letterSpacing: "0.1em",
        }}
      >
        MENARA FIRE SAFETY
      </p>

      <h1
        style={{
          marginBottom: "8px",
          fontSize: "28px",
          letterSpacing: "-0.03em",
        }}
      >
        {title}
      </h1>

      <p
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "13px",
        }}
      >
        {description}
      </p>
    </section>
  );
}

export default PlaceholderPage;