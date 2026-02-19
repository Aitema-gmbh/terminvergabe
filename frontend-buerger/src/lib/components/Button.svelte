<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    variant?: "primary" | "secondary" | "danger";
    type?: "button" | "submit";
    disabled?: boolean;
    onclick?: () => void;
    children: Snippet;
  }

  let { variant = "primary", type = "button", disabled = false, onclick, children }: Props = $props();
</script>

<button
  class="btn btn-{variant}"
  {type}
  {disabled}
  {onclick}
  aria-disabled={disabled}
>
  {@render children()}
</button>

<style>
  .btn {
    padding: 0.625rem 1.25rem;
    font-size: 1rem;
    font-weight: 600;
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 44px; /* WCAG touch target */
    min-width: 44px;
  }

  .btn:focus-visible {
    outline: 3px solid #ff9900;
    outline-offset: 2px;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #003366;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #004d99;
  }

  .btn-secondary {
    background: white;
    color: #003366;
    border-color: #003366;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #f0f4f8;
  }

  .btn-danger {
    background: #cc0000;
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: #990000;
  }
</style>
