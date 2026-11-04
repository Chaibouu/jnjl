"use client";

import ReactSelect, { type StylesConfig } from "react-select";
import charter from "@/settings/charter";

export type ChoiceOption = { value: string; label: string };

/** Style des listes de choix du site (react-select) : champs droits, bordure et orange de la charte. */
const styles: StylesConfig<ChoiceOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    borderRadius: 0,
    borderColor: state.isFocused ? charter.orange : charter.border,
    backgroundColor: state.isFocused ? "#fff" : "rgba(244,244,245,0.6)",
    boxShadow: "none",
    "&:hover": { borderColor: state.isFocused ? charter.orange : "#cfcfd4" },
  }),
  valueContainer: base => ({ ...base, padding: "2px 14px" }),
  placeholder: base => ({ ...base, color: "rgba(40,40,40,0.5)" }),
  singleValue: base => ({ ...base, color: charter.ink }),
  indicatorSeparator: () => ({ display: "none" }),
  menu: base => ({
    ...base,
    borderRadius: 0,
    border: `1px solid ${charter.border}`,
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    zIndex: 40,
  }),
  option: (base, state) => ({
    ...base,
    cursor: "pointer",
    color: state.isSelected ? "#fff" : charter.ink,
    backgroundColor: state.isSelected ? charter.orange : state.isFocused ? `${charter.orange}1f` : "transparent",
    ":active": { backgroundColor: state.isSelected ? charter.orange : `${charter.orange}33` },
  }),
  noOptionsMessage: base => ({ ...base, color: charter.inkSoft }),
};

/**
 * Liste de choix avec recherche (react-select), contrôlée par la valeur (chaîne). Les libellés sont fournis tels quels :
 * rien n'est ajouté (pas de code entre parenthèses).
 */
export function ChoiceSelect({
  options,
  value,
  onChange,
  placeholder = "Choisir",
  inputId,
  searchable = true,
}: {
  options: ChoiceOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputId?: string;
  searchable?: boolean;
}) {
  return (
    <ReactSelect<ChoiceOption, false>
      inputId={inputId}
      options={options}
      value={options.find(option => option.value === value) ?? null}
      onChange={option => option && onChange(option.value)}
      placeholder={placeholder}
      isSearchable={searchable}
      styles={styles}
      noOptionsMessage={() => "Aucun résultat"}
      menuPlacement="auto"
      instanceId={inputId}
    />
  );
}
