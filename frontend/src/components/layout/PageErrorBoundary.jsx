import { Component } from "react";

// Keeps a failure inside one page from blanking the whole site: the header,
// menu and footer stay usable and the visitor gets a way forward.
export default class PageErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="bg-navy-950 text-white">
        <div className="wrap flex min-h-[70vh] flex-col justify-center pb-20 pt-36">
          <h1 className="font-display text-4xl font-bold">Something went wrong on this page.</h1>
          <p className="mt-4 max-w-xl text-white/70">Please try again, or use the menu to carry on browsing.</p>
          <div className="mt-8 flex gap-4">
            <button type="button" onClick={() => window.location.reload()} className="btn-primary rounded-none">Reload page</button>
            <a href="/" className="btn-ghost rounded-none">Go to the homepage</a>
          </div>
        </div>
      </main>
    );
  }
}
