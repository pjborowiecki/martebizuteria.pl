import { type DEFAULT_LOCALE, type LOCALES } from "~/src/integrations/use-intl/i18n.config"
import { type DEFAULT_TIMEZONE, type TIME_ZONES } from "~/src/integrations/use-intl/i18n.timezones"

import type common from "~/messages/en/common.json"
import type componentsCustom from "~/messages/en/components.custom.json"
import type componentsDatagrid from "~/messages/en/components.datagrid.json"
import type componentsShadcn from "~/messages/en/components.shadcn.json"
import type pagesAbout from "~/messages/en/pages.about.json"
import type pagesAccount from "~/messages/en/pages.account.json"
import type pagesAccountMeta from "~/messages/en/pages.account.meta.json"
import type pagesAdminCatalogAttributes from "~/messages/en/pages.admin.catalog.attributes.json"
import type pagesAdminCatalogCategories from "~/messages/en/pages.admin.catalog.categories.json"
import type pagesAdminCatalogCollections from "~/messages/en/pages.admin.catalog.collections.json"
import type pagesAdminCatalog from "~/messages/en/pages.admin.catalog.json"
import type pagesAdminCatalogLocalePicker from "~/messages/en/pages.admin.catalog.localePicker.json"
import type pagesAdminCatalogProductsCatalogList from "~/messages/en/pages.admin.catalog.products.catalogList.json"
import type pagesAdminCatalogProducts from "~/messages/en/pages.admin.catalog.products.json"
import type pagesAdminCustomers from "~/messages/en/pages.admin.customers.json"
import type pagesAdmin from "~/messages/en/pages.admin.json"
import type pagesAuthErrors from "~/messages/en/pages.auth.errors.json"
import type pagesAuthForgotPassword from "~/messages/en/pages.auth.forgot-password.json"
import type pagesAuthOauth from "~/messages/en/pages.auth.oauth.json"
import type pagesAuthResetPassword from "~/messages/en/pages.auth.reset-password.json"
import type pagesAuthSignIn from "~/messages/en/pages.auth.sign-in.json"
import type pagesAuthSignUp from "~/messages/en/pages.auth.sign-up.json"
import type pagesAuthToast from "~/messages/en/pages.auth.toast.json"
import type pagesAuthValidations from "~/messages/en/pages.auth.validations.json"
import type pagesBlog from "~/messages/en/pages.blog.json"
import type pagesCart from "~/messages/en/pages.cart.json"
import type pagesCategories from "~/messages/en/pages.categories.json"
import type pagesCategory from "~/messages/en/pages.category.json"
import type pagesCheckout from "~/messages/en/pages.checkout.json"
import type pagesCollection from "~/messages/en/pages.collection.json"
import type pagesCollections from "~/messages/en/pages.collections.json"
import type pagesExchangesAndReturns from "~/messages/en/pages.exchanges-and-returns.json"
import type pagesFaq from "~/messages/en/pages.faq.json"
import type pagesHome from "~/messages/en/pages.home.json"
import type pagesLanding from "~/messages/en/pages.landing.json"
import type pagesPrivacyPolicy from "~/messages/en/pages.privacyPolicy.json"
import type pagesProduct from "~/messages/en/pages.product.json"
import type pagesProducts from "~/messages/en/pages.products.json"
import type pagesTermsOfService from "~/messages/en/pages.terms-of-service.json"

export type Locale = (typeof LOCALES)[number]
export type DefaultLocale = typeof DEFAULT_LOCALE
export type TimeZone = (typeof TIME_ZONES)[number]
export type DefaultTimeZone = typeof DEFAULT_TIMEZONE

export interface NamespaceMessages {
  readonly common: typeof common
  readonly "components.custom": typeof componentsCustom
  readonly "components.datagrid": typeof componentsDatagrid
  readonly "components.shadcn": typeof componentsShadcn
  readonly "pages.about": typeof pagesAbout
  readonly "pages.account": typeof pagesAccount
  readonly "pages.account.meta": typeof pagesAccountMeta
  readonly "pages.admin.catalog.attributes": typeof pagesAdminCatalogAttributes
  readonly "pages.admin.catalog.categories": typeof pagesAdminCatalogCategories
  readonly "pages.admin.catalog.collections": typeof pagesAdminCatalogCollections
  readonly "pages.admin.catalog": typeof pagesAdminCatalog
  readonly "pages.admin.catalog.localePicker": typeof pagesAdminCatalogLocalePicker
  readonly "pages.admin.catalog.products.catalogList": typeof pagesAdminCatalogProductsCatalogList
  readonly "pages.admin.catalog.products": typeof pagesAdminCatalogProducts
  readonly "pages.admin.customers": typeof pagesAdminCustomers
  readonly "pages.admin": typeof pagesAdmin
  readonly "pages.auth.errors": typeof pagesAuthErrors
  readonly "pages.auth.forgot-password": typeof pagesAuthForgotPassword
  readonly "pages.auth.oauth": typeof pagesAuthOauth
  readonly "pages.auth.reset-password": typeof pagesAuthResetPassword
  readonly "pages.auth.sign-in": typeof pagesAuthSignIn
  readonly "pages.auth.sign-up": typeof pagesAuthSignUp
  readonly "pages.auth.toast": typeof pagesAuthToast
  readonly "pages.auth.validations": typeof pagesAuthValidations
  readonly "pages.blog": typeof pagesBlog
  readonly "pages.cart": typeof pagesCart
  readonly "pages.categories": typeof pagesCategories
  readonly "pages.category": typeof pagesCategory
  readonly "pages.checkout": typeof pagesCheckout
  readonly "pages.collection": typeof pagesCollection
  readonly "pages.collections": typeof pagesCollections
  readonly "pages.exchanges-and-returns": typeof pagesExchangesAndReturns
  readonly "pages.faq": typeof pagesFaq
  readonly "pages.home": typeof pagesHome
  readonly "pages.landing": typeof pagesLanding
  readonly "pages.privacyPolicy": typeof pagesPrivacyPolicy
  readonly "pages.product": typeof pagesProduct
  readonly "pages.products": typeof pagesProducts
  readonly "pages.terms-of-service": typeof pagesTermsOfService
}

export type MessageNamespace = keyof NamespaceMessages

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    namespaces?: readonly MessageNamespace[]
  }
}
