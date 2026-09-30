import { relations } from "drizzle-orm/relations";
import { user, account, address, cart, productVariant, cartItem, checkout, deliveryMethod, courier, order, payment, orderAddress, orderItem, session, twoFactor, inventory, product, categoryOnProduct, productCategory, collectionOnProduct, productCollection, productOption, productOptionValue, optionOnVariant, productImage, attributeOnProduct, productAttribute } from "./schema";

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	accounts: many(account),
	addresses: many(address),
	carts: many(cart),
	checkouts: many(checkout),
	orders: many(order),
	sessions: many(session),
	twoFactors: many(twoFactor),
}));

export const addressRelations = relations(address, ({one, many}) => ({
	user: one(user, {
		fields: [address.userId],
		references: [user.id]
	}),
	checkouts_shippingAddressId: many(checkout, {
		relationName: "checkout_shippingAddressId_address_id"
	}),
	checkouts_billingAddressId: many(checkout, {
		relationName: "checkout_billingAddressId_address_id"
	}),
}));

export const cartRelations = relations(cart, ({one, many}) => ({
	user: one(user, {
		fields: [cart.userId],
		references: [user.id]
	}),
	cartItems: many(cartItem),
	checkouts: many(checkout),
}));

export const cartItemRelations = relations(cartItem, ({one}) => ({
	productVariant: one(productVariant, {
		fields: [cartItem.variantId],
		references: [productVariant.id]
	}),
	cart: one(cart, {
		fields: [cartItem.cartId],
		references: [cart.id]
	}),
}));

export const productVariantRelations = relations(productVariant, ({one, many}) => ({
	cartItems: many(cartItem),
	orderItems: many(orderItem),
	inventories: many(inventory),
	product: one(product, {
		fields: [productVariant.productId],
		references: [product.id]
	}),
	optionOnVariants: many(optionOnVariant),
	productImages: many(productImage),
	attributeOnProducts: many(attributeOnProduct),
}));

export const checkoutRelations = relations(checkout, ({one, many}) => ({
	user: one(user, {
		fields: [checkout.userId],
		references: [user.id]
	}),
	address_shippingAddressId: one(address, {
		fields: [checkout.shippingAddressId],
		references: [address.id],
		relationName: "checkout_shippingAddressId_address_id"
	}),
	deliveryMethod: one(deliveryMethod, {
		fields: [checkout.deliveryMethodId],
		references: [deliveryMethod.id]
	}),
	cart: one(cart, {
		fields: [checkout.cartId],
		references: [cart.id]
	}),
	address_billingAddressId: one(address, {
		fields: [checkout.billingAddressId],
		references: [address.id],
		relationName: "checkout_billingAddressId_address_id"
	}),
	orders: many(order),
	payments: many(payment),
}));

export const deliveryMethodRelations = relations(deliveryMethod, ({one, many}) => ({
	checkouts: many(checkout),
	courier: one(courier, {
		fields: [deliveryMethod.courierId],
		references: [courier.id]
	}),
	orders: many(order),
}));

export const courierRelations = relations(courier, ({many}) => ({
	deliveryMethods: many(deliveryMethod),
}));

export const orderRelations = relations(order, ({one, many}) => ({
	user: one(user, {
		fields: [order.userId],
		references: [user.id]
	}),
	payment: one(payment, {
		fields: [order.paymentId],
		references: [payment.id]
	}),
	deliveryMethod: one(deliveryMethod, {
		fields: [order.deliveryMethodId],
		references: [deliveryMethod.id]
	}),
	checkout: one(checkout, {
		fields: [order.checkoutId],
		references: [checkout.id]
	}),
	orderAddresses: many(orderAddress),
	orderItems: many(orderItem),
}));

export const paymentRelations = relations(payment, ({one, many}) => ({
	orders: many(order),
	checkout: one(checkout, {
		fields: [payment.checkoutId],
		references: [checkout.id]
	}),
}));

export const orderAddressRelations = relations(orderAddress, ({one}) => ({
	order: one(order, {
		fields: [orderAddress.orderId],
		references: [order.id]
	}),
}));

export const orderItemRelations = relations(orderItem, ({one}) => ({
	productVariant: one(productVariant, {
		fields: [orderItem.variantId],
		references: [productVariant.id]
	}),
	order: one(order, {
		fields: [orderItem.orderId],
		references: [order.id]
	}),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const twoFactorRelations = relations(twoFactor, ({one}) => ({
	user: one(user, {
		fields: [twoFactor.userId],
		references: [user.id]
	}),
}));

export const inventoryRelations = relations(inventory, ({one}) => ({
	productVariant: one(productVariant, {
		fields: [inventory.variantId],
		references: [productVariant.id]
	}),
}));

export const productRelations = relations(product, ({many}) => ({
	productVariants: many(productVariant),
	categoryOnProducts: many(categoryOnProduct),
	collectionOnProducts: many(collectionOnProduct),
	productOptions: many(productOption),
	productImages: many(productImage),
	attributeOnProducts: many(attributeOnProduct),
}));

export const categoryOnProductRelations = relations(categoryOnProduct, ({one}) => ({
	product: one(product, {
		fields: [categoryOnProduct.productId],
		references: [product.id]
	}),
	productCategory: one(productCategory, {
		fields: [categoryOnProduct.categoryId],
		references: [productCategory.id]
	}),
}));

export const productCategoryRelations = relations(productCategory, ({one, many}) => ({
	categoryOnProducts: many(categoryOnProduct),
	productCategory: one(productCategory, {
		fields: [productCategory.parentId],
		references: [productCategory.id],
		relationName: "productCategory_parentId_productCategory_id"
	}),
	productCategories: many(productCategory, {
		relationName: "productCategory_parentId_productCategory_id"
	}),
}));

export const collectionOnProductRelations = relations(collectionOnProduct, ({one}) => ({
	product: one(product, {
		fields: [collectionOnProduct.productId],
		references: [product.id]
	}),
	productCollection: one(productCollection, {
		fields: [collectionOnProduct.collectionId],
		references: [productCollection.id]
	}),
}));

export const productCollectionRelations = relations(productCollection, ({many}) => ({
	collectionOnProducts: many(collectionOnProduct),
}));

export const productOptionRelations = relations(productOption, ({one, many}) => ({
	product: one(product, {
		fields: [productOption.productId],
		references: [product.id]
	}),
	productOptionValues: many(productOptionValue),
	optionOnVariants: many(optionOnVariant),
}));

export const productOptionValueRelations = relations(productOptionValue, ({one, many}) => ({
	productOption: one(productOption, {
		fields: [productOptionValue.optionId],
		references: [productOption.id]
	}),
	optionOnVariants: many(optionOnVariant),
}));

export const optionOnVariantRelations = relations(optionOnVariant, ({one}) => ({
	productVariant: one(productVariant, {
		fields: [optionOnVariant.variantId],
		references: [productVariant.id]
	}),
	productOptionValue: one(productOptionValue, {
		fields: [optionOnVariant.valueId],
		references: [productOptionValue.id]
	}),
	productOption: one(productOption, {
		fields: [optionOnVariant.optionId],
		references: [productOption.id]
	}),
}));

export const productImageRelations = relations(productImage, ({one}) => ({
	productVariant: one(productVariant, {
		fields: [productImage.variantId],
		references: [productVariant.id]
	}),
	product: one(product, {
		fields: [productImage.productId],
		references: [product.id]
	}),
}));

export const attributeOnProductRelations = relations(attributeOnProduct, ({one}) => ({
	productVariant: one(productVariant, {
		fields: [attributeOnProduct.variantId],
		references: [productVariant.id]
	}),
	product: one(product, {
		fields: [attributeOnProduct.productId],
		references: [product.id]
	}),
	productAttribute: one(productAttribute, {
		fields: [attributeOnProduct.attributeId],
		references: [productAttribute.id]
	}),
}));

export const productAttributeRelations = relations(productAttribute, ({many}) => ({
	attributeOnProducts: many(attributeOnProduct),
}));