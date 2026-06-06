import { type JSX } from "react";

import { AddressSection } from "~/src/components/custom/pages/admin/customers/customer-detail/edit-customer/_sections/address-section";
import { ContactSection } from "~/src/components/custom/pages/admin/customers/customer-detail/edit-customer/_sections/contact-section";
import { NotesSection } from "~/src/components/custom/pages/admin/customers/customer-detail/edit-customer/_sections/notes-section";
import { TagsSection } from "~/src/components/custom/pages/admin/customers/customer-detail/edit-customer/_sections/tags-section";

export function CustomerFormSections(): JSX.Element {
  return (
    <div className="space-y-10">
      <ContactSection />
      <AddressSection />
      <NotesSection />
      <TagsSection />
    </div>
  );
}
