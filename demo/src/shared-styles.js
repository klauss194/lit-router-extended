import { css } from "lit";

export const sharedStyles = css`
  :host {
    display: block;
  }
  .card {
    background: #171a21;
    border: 1px solid #2a2f3a;
    border-radius: 10px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1rem;
  }
  h1 {
    font-size: 1.4rem;
    margin: 0 0 0.5rem;
  }
  h2 {
    font-size: 1.1rem;
    margin: 0 0 0.5rem;
  }
  p {
    line-height: 1.5;
    color: #b9bfca;
  }
  code {
    background: #0d0f13;
    border-radius: 4px;
    padding: 0.1rem 0.35rem;
    font-size: 0.9em;
  }
  a,
  .link-btn {
    color: #7ab8ff;
    text-decoration: none;
    cursor: pointer;
  }
  a:hover,
  .link-btn:hover {
    text-decoration: underline;
  }
  button {
    background: #2a5adb;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 0.45rem 0.9rem;
    cursor: pointer;
    font-size: 0.9rem;
  }
  button:hover {
    background: #3b6ceb;
  }
  button.secondary {
    background: #2a2f3a;
  }
  button.secondary:hover {
    background: #3a4150;
  }
  input {
    background: #0d0f13;
    border: 1px solid #2a2f3a;
    color: #e6e6e6;
    border-radius: 6px;
    padding: 0.4rem 0.6rem;
  }
  ul {
    padding-left: 1.2rem;
    color: #b9bfca;
  }
  .badge {
    display: inline-block;
    background: #2a2f3a;
    border-radius: 999px;
    padding: 0.1rem 0.6rem;
    font-size: 0.75rem;
    color: #9fb3c8;
    margin-left: 0.4rem;
  }
`;
