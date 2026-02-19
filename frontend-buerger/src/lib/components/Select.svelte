<script lang="ts">
  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    id?: string;
    options: Option[];
    value: string;
    label?: string;
    placeholder?: string;
    required?: boolean;
    onchange?: (value: string) => void;
  }

  let { id, options, value = $bindable(), label, placeholder = "Bitte waehlen...", required = false, onchange }: Props = $props();

  function handleChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    value = target.value;
    onchange?.(value);
  }
</script>

<div class="select-wrapper">
  {#if label}
    <label for={id}>{label}{required ? " *" : ""}</label>
  {/if}
  <select {id} {value} {required} onchange={handleChange} aria-required={required}>
    <option value="" disabled>{placeholder}</option>
    {#each options as opt}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>
</div>

<style>
  .select-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  label {
    font-weight: 600;
    font-size: 0.875rem;
    color: #333;
  }

  select {
    padding: 0.625rem;
    border: 2px solid #ccc;
    border-radius: 6px;
    font-size: 1rem;
    background: white;
    min-height: 44px;
    cursor: pointer;
  }

  select:focus {
    outline: none;
    border-color: #003366;
    box-shadow: 0 0 0 3px rgba(0, 51, 102, 0.2);
  }
</style>
