import Link from "next/link";

export default function NotFound() {
  return (
    <section className="panel" aria-labelledby="notfound-title">
      <h1 className="panel-title" id="notfound-title">
        No such name
      </h1>
      <p className="mono muted">
        That SuiNS name is not registered, has expired, or is not held by a single
        address.
      </p>
      <Link className="btn-secondary" href="/">
        Back to your names
      </Link>
    </section>
  );
}
