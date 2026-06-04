import type common from "~/messages/en/common.json";
import type componentsCustom from "~/messages/en/components.custom.json";
import type componentsDatagrid from "~/messages/en/components.datagrid.json";
import type componentsShadcn from "~/messages/en/components.shadcn.json";
import type emails from "~/messages/en/emails.json";
import type pagesAbout from "~/messages/en/pages.about.json";
import type pagesAccount from "~/messages/en/pages.account.json";
import type pagesAccountMeta from "~/messages/en/pages.account.meta.json";
import type pagesAdminCatalogAttributes from "~/messages/en/pages.admin.catalog.attributes.json";
import type pagesAdminCatalogCategories from "~/messages/en/pages.admin.catalog.categories.json";
import type pagesAdminCatalogCollections from "~/messages/en/pages.admin.catalog.collections.json";
import type pagesAdminCatalog from "~/messages/en/pages.admin.catalog.json";
import type pagesAdminCatalogLocalePicker from "~/messages/en/pages.admin.catalog.localePicker.json";
import type pagesAdminCatalogProductsCatalogList from "~/messages/en/pages.admin.catalog.products.catalogList.json";
import type pagesAdminCatalogProducts from "~/messages/en/pages.admin.catalog.products.json";
import type pagesAdmin from "~/messages/en/pages.admin.json";
import type pagesAuthEmail from "~/messages/en/pages.auth.email.json";
import type pagesAuthErrors from "~/messages/en/pages.auth.errors.json";
import type pagesAuthForgotPassword from "~/messages/en/pages.auth.forgot-password.json";
import type pagesAuthOauth from "~/messages/en/pages.auth.oauth.json";
import type pagesAuthResetPassword from "~/messages/en/pages.auth.reset-password.json";
import type pagesAuthSignIn from "~/messages/en/pages.auth.sign-in.json";
import type pagesAuthSignUp from "~/messages/en/pages.auth.sign-up.json";
import type pagesAuthToast from "~/messages/en/pages.auth.toast.json";
import type pagesAuthValidations from "~/messages/en/pages.auth.validations.json";
import type pagesCart from "~/messages/en/pages.cart.json";
import type pagesCategories from "~/messages/en/pages.categories.json";
import type pagesCategory from "~/messages/en/pages.category.json";
import type pagesCheckout from "~/messages/en/pages.checkout.json";
import type pagesCollection from "~/messages/en/pages.collection.json";
import type pagesCollections from "~/messages/en/pages.collections.json";
import type pagesExchangesAndReturns from "~/messages/en/pages.exchanges-and-returns.json";
import type pagesFaq from "~/messages/en/pages.faq.json";
import type pagesHome from "~/messages/en/pages.home.json";
import type pagesLanding from "~/messages/en/pages.landing.json";
import type pagesPrivacyPolicy from "~/messages/en/pages.privacyPolicy.json";
import type pagesProduct from "~/messages/en/pages.product.json";
import type pagesProducts from "~/messages/en/pages.products.json";
import type pagesTermsOfService from "~/messages/en/pages.terms-of-service.json";

export interface Messages {
  readonly common: typeof common;
  readonly components: {
    readonly custom: typeof componentsCustom;
    readonly datagrid: typeof componentsDatagrid;
    readonly shadcn: typeof componentsShadcn;
  };
  readonly emails: typeof emails;
  readonly pages: {
    readonly about: typeof pagesAbout;
    readonly account: typeof pagesAccount & { readonly meta: typeof pagesAccountMeta };
    readonly admin: typeof pagesAdmin & {
      readonly catalog: typeof pagesAdminCatalog & {
        readonly categories: typeof pagesAdminCatalogCategories;
        readonly collections: typeof pagesAdminCatalogCollections;
        readonly products: typeof pagesAdminCatalogProducts & {
          readonly catalogList: typeof pagesAdminCatalogProductsCatalogList;
        };
        readonly attributes: typeof pagesAdminCatalogAttributes;
        readonly localePicker: typeof pagesAdminCatalogLocalePicker;
      };
    };
    readonly auth: {
      readonly email: typeof pagesAuthEmail;
      readonly errors: typeof pagesAuthErrors;
      readonly "forgot-password": typeof pagesAuthForgotPassword;
      readonly oauth: typeof pagesAuthOauth;
      readonly "reset-password": typeof pagesAuthResetPassword;
      readonly "sign-in": typeof pagesAuthSignIn;
      readonly "sign-up": typeof pagesAuthSignUp;
      readonly toast: typeof pagesAuthToast;
      readonly validations: typeof pagesAuthValidations;
    };
    readonly cart: typeof pagesCart;
    readonly categories: typeof pagesCategories;
    readonly category: typeof pagesCategory;
    readonly checkout: typeof pagesCheckout;
    readonly collection: typeof pagesCollection;
    readonly collections: typeof pagesCollections;
    readonly "exchanges-and-returns": typeof pagesExchangesAndReturns;
    readonly faq: typeof pagesFaq;
    readonly home: typeof pagesHome;
    readonly landing: typeof pagesLanding;
    readonly privacyPolicy: typeof pagesPrivacyPolicy;
    readonly product: typeof pagesProduct;
    readonly products: typeof pagesProducts;
    readonly "terms-of-service": typeof pagesTermsOfService;
  };
}
