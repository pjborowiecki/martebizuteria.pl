import type { Locale } from "~/src/constants/types";

import type { Messages } from "~/src/integrations/use-intl/i18n.types";

import enCommon from "~/messages/en/common.json";
import enComponentsCustom from "~/messages/en/components.custom.json";
import enComponentsDatagrid from "~/messages/en/components.datagrid.json";
import enComponentsShadcn from "~/messages/en/components.shadcn.json";
import enEmails from "~/messages/en/emails.json";
import enPagesAbout from "~/messages/en/pages.about.json";
import enPagesAccount from "~/messages/en/pages.account.json";
import enPagesAccountMeta from "~/messages/en/pages.account.meta.json";
import enPagesAdminCatalogCategories from "~/messages/en/pages.admin.catalog.categories.json";
import enPagesAdminCatalogCollections from "~/messages/en/pages.admin.catalog.collections.json";
import enPagesAdminCatalog from "~/messages/en/pages.admin.catalog.json";
import enPagesAdminCatalogProducts from "~/messages/en/pages.admin.catalog.products.json";
import enPagesAdmin from "~/messages/en/pages.admin.json";
import enPagesAuthEmail from "~/messages/en/pages.auth.email.json";
import enPagesAuthErrors from "~/messages/en/pages.auth.errors.json";
import enPagesAuthForgotPassword from "~/messages/en/pages.auth.forgot-password.json";
import enPagesAuthOauth from "~/messages/en/pages.auth.oauth.json";
import enPagesAuthResetPassword from "~/messages/en/pages.auth.reset-password.json";
import enPagesAuthSignIn from "~/messages/en/pages.auth.sign-in.json";
import enPagesAuthSignUp from "~/messages/en/pages.auth.sign-up.json";
import enPagesAuthToast from "~/messages/en/pages.auth.toast.json";
import enPagesAuthValidations from "~/messages/en/pages.auth.validations.json";
import enPagesCart from "~/messages/en/pages.cart.json";
import enPagesCategories from "~/messages/en/pages.categories.json";
import enPagesCategory from "~/messages/en/pages.category.json";
import enPagesCheckout from "~/messages/en/pages.checkout.json";
import enPagesCollection from "~/messages/en/pages.collection.json";
import enPagesCollections from "~/messages/en/pages.collections.json";
import enPagesExchangesAndReturns from "~/messages/en/pages.exchanges-and-returns.json";
import enPagesFaq from "~/messages/en/pages.faq.json";
import enPagesHome from "~/messages/en/pages.home.json";
import enPagesLanding from "~/messages/en/pages.landing.json";
import enPagesPrivacyPolicy from "~/messages/en/pages.privacyPolicy.json";
import enPagesProduct from "~/messages/en/pages.product.json";
import enPagesProducts from "~/messages/en/pages.products.json";
import enPagesTermsOfService from "~/messages/en/pages.terms-of-service.json";
import plCommon from "~/messages/pl/common.json";
import plComponentsCustom from "~/messages/pl/components.custom.json";
import plComponentsDatagrid from "~/messages/pl/components.datagrid.json";
import plComponentsShadcn from "~/messages/pl/components.shadcn.json";
import plEmails from "~/messages/pl/emails.json";
import plPagesAbout from "~/messages/pl/pages.about.json";
import plPagesAccount from "~/messages/pl/pages.account.json";
import plPagesAccountMeta from "~/messages/pl/pages.account.meta.json";
import plPagesAdminCatalogCategories from "~/messages/pl/pages.admin.catalog.categories.json";
import plPagesAdminCatalogCollections from "~/messages/pl/pages.admin.catalog.collections.json";
import plPagesAdminCatalog from "~/messages/pl/pages.admin.catalog.json";
import plPagesAdminCatalogProducts from "~/messages/pl/pages.admin.catalog.products.json";
import plPagesAdmin from "~/messages/pl/pages.admin.json";
import plPagesAuthEmail from "~/messages/pl/pages.auth.email.json";
import plPagesAuthErrors from "~/messages/pl/pages.auth.errors.json";
import plPagesAuthForgotPassword from "~/messages/pl/pages.auth.forgot-password.json";
import plPagesAuthOauth from "~/messages/pl/pages.auth.oauth.json";
import plPagesAuthResetPassword from "~/messages/pl/pages.auth.reset-password.json";
import plPagesAuthSignIn from "~/messages/pl/pages.auth.sign-in.json";
import plPagesAuthSignUp from "~/messages/pl/pages.auth.sign-up.json";
import plPagesAuthToast from "~/messages/pl/pages.auth.toast.json";
import plPagesAuthValidations from "~/messages/pl/pages.auth.validations.json";
import plPagesCart from "~/messages/pl/pages.cart.json";
import plPagesCategories from "~/messages/pl/pages.categories.json";
import plPagesCategory from "~/messages/pl/pages.category.json";
import plPagesCheckout from "~/messages/pl/pages.checkout.json";
import plPagesCollection from "~/messages/pl/pages.collection.json";
import plPagesCollections from "~/messages/pl/pages.collections.json";
import plPagesExchangesAndReturns from "~/messages/pl/pages.exchanges-and-returns.json";
import plPagesFaq from "~/messages/pl/pages.faq.json";
import plPagesHome from "~/messages/pl/pages.home.json";
import plPagesLanding from "~/messages/pl/pages.landing.json";
import plPagesPrivacyPolicy from "~/messages/pl/pages.privacyPolicy.json";
import plPagesProduct from "~/messages/pl/pages.product.json";
import plPagesProducts from "~/messages/pl/pages.products.json";
import plPagesTermsOfService from "~/messages/pl/pages.terms-of-service.json";

const EN_MESSAGES = {
  common: enCommon,
  components: {
    custom: enComponentsCustom,
    datagrid: enComponentsDatagrid,
    shadcn: enComponentsShadcn
  },
  emails: enEmails,
  pages: {
    about: enPagesAbout,
    account: { ...enPagesAccount, meta: enPagesAccountMeta },
    admin: {
      ...enPagesAdmin,
      catalog: {
        ...enPagesAdminCatalog,
        categories: enPagesAdminCatalogCategories,
        collections: enPagesAdminCatalogCollections,
        products: enPagesAdminCatalogProducts
      }
    },
    auth: {
      email: enPagesAuthEmail,
      errors: enPagesAuthErrors,
      "forgot-password": enPagesAuthForgotPassword,
      oauth: enPagesAuthOauth,
      "reset-password": enPagesAuthResetPassword,
      "sign-in": enPagesAuthSignIn,
      "sign-up": enPagesAuthSignUp,
      toast: enPagesAuthToast,
      validations: enPagesAuthValidations
    },
    cart: enPagesCart,
    categories: enPagesCategories,
    category: enPagesCategory,
    checkout: enPagesCheckout,
    collection: enPagesCollection,
    collections: enPagesCollections,
    "exchanges-and-returns": enPagesExchangesAndReturns,
    faq: enPagesFaq,
    home: enPagesHome,
    landing: enPagesLanding,
    privacyPolicy: enPagesPrivacyPolicy,
    product: enPagesProduct,
    products: enPagesProducts,
    "terms-of-service": enPagesTermsOfService
  }
} satisfies Messages;

const PL_MESSAGES = {
  common: plCommon,
  components: {
    custom: plComponentsCustom,
    datagrid: plComponentsDatagrid,
    shadcn: plComponentsShadcn
  },
  emails: plEmails,
  pages: {
    about: plPagesAbout,
    account: { ...plPagesAccount, meta: plPagesAccountMeta },
    admin: {
      ...plPagesAdmin,
      catalog: {
        ...plPagesAdminCatalog,
        categories: plPagesAdminCatalogCategories,
        collections: plPagesAdminCatalogCollections,
        products: plPagesAdminCatalogProducts
      }
    },
    auth: {
      email: plPagesAuthEmail,
      errors: plPagesAuthErrors,
      "forgot-password": plPagesAuthForgotPassword,
      oauth: plPagesAuthOauth,
      "reset-password": plPagesAuthResetPassword,
      "sign-in": plPagesAuthSignIn,
      "sign-up": plPagesAuthSignUp,
      toast: plPagesAuthToast,
      validations: plPagesAuthValidations
    },
    cart: plPagesCart,
    categories: plPagesCategories,
    category: plPagesCategory,
    checkout: plPagesCheckout,
    collection: plPagesCollection,
    collections: plPagesCollections,
    "exchanges-and-returns": plPagesExchangesAndReturns,
    faq: plPagesFaq,
    home: plPagesHome,
    landing: plPagesLanding,
    privacyPolicy: plPagesPrivacyPolicy,
    product: plPagesProduct,
    products: plPagesProducts,
    "terms-of-service": plPagesTermsOfService
  }
} satisfies Messages;

const MESSAGES_BY_LOCALE: Record<Locale, Messages> = {
  en: EN_MESSAGES,
  pl: PL_MESSAGES
};

export function getMessagesBundle(locale: Locale): Messages {
  return MESSAGES_BY_LOCALE[locale];
}
