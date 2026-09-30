import { sqliteTable, AnySQLiteColumn, integer, text, numeric, index, foreignKey, uniqueIndex, primaryKey } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const d1Migrations = sqliteTable("d1_migrations", {
	id: integer().primaryKey({ autoIncrement: true }),
	name: text(),
	appliedAt: numeric("applied_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const account = sqliteTable("account", {
	accessToken: text("access_token", { length: 16384 }),
	accessTokenExpiresAt: integer("access_token_expires_at"),
	accountId: text("account_id", { length: 1024 }).notNull(),
	id: text().primaryKey().notNull(),
	idToken: text("id_token", { length: 16384 }),
	password: text({ length: 512 }),
	providerId: text("provider_id", { length: 128 }).notNull(),
	refreshToken: text("refresh_token", { length: 16384 }),
	refreshTokenExpiresAt: integer("refresh_token_expires_at"),
	scope: text({ length: 8192 }),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" } ),
	createdAt: integer("created_at").default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch() * 1000)`).notNull(),
},
(table) => [
	index("account_userId_idx").on(table.userId),
]);

export const address = sqliteTable("address", {
	address1: text({ length: 512 }).notNull(),
	address2: text({ length: 512 }),
	city: text({ length: 256 }).notNull(),
	countryCode: text("country_code", { length: 2 }).notNull(),
	firstName: text("first_name", { length: 256 }),
	id: text().primaryKey().notNull(),
	isDefault: integer("is_default").default(false).notNull(),
	lastName: text("last_name", { length: 256 }),
	phone: text({ length: 32 }),
	postalCode: text("postal_code", { length: 32 }),
	province: text({ length: 256 }),
	userId: text("user_id").references(() => user.id, { onDelete: "cascade" } ),
	createdAt: integer("created_at").default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch() * 1000)`).notNull(),
},
(table) => [
	index("address_userId_isDefault_idx").on(table.userId, table.isDefault),
	index("address_userId_idx").on(table.userId),
]);

export const cart = sqliteTable("cart", {
	discountId: text("discount_id"),
	expiresAt: integer("expires_at"),
	id: text().primaryKey().notNull(),
	sessionId: text("session_id"),
	userId: text("user_id").references(() => user.id, { onDelete: "set null" } ),
	createdAt: integer("created_at").default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch() * 1000)`).notNull(),
},
(table) => [
	index("cart_sessionId_idx").on(table.sessionId),
	index("cart_userId_idx").on(table.userId),
]);

export const cartItem = sqliteTable("cart_item", {
	addedAt: integer("added_at").default(sql`(unixepoch() * 1000)`).notNull(),
	cartId: text("cart_id").notNull().references(() => cart.id, { onDelete: "cascade" } ),
	id: text().primaryKey().notNull(),
	quantity: integer().default(1).notNull(),
	variantId: text("variant_id").notNull().references(() => productVariant.id, { onDelete: "cascade" } ),
	createdAt: integer("created_at").default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch() * 1000)`).notNull(),
},
(table) => [
	index("cartItem_variantId_idx").on(table.variantId),
	index("cartItem_cartId_idx").on(table.cartId),
]);

export const checkout = sqliteTable("checkout", {
	billingAddressId: text("billing_address_id").references(() => address.id, { onDelete: "set null" } ),
	cartId: text("cart_id").references(() => cart.id, { onDelete: "set null" } ),
	customerNote: text("customer_note"),
	deliveryMethodId: text("delivery_method_id").references(() => deliveryMethod.id, { onDelete: "set null" } ),
	discountId: text("discount_id"),
	email: text({ length: 320 }).notNull(),
	id: text().primaryKey().notNull(),
	lockerId: text("locker_id"),
	shippingAddressId: text("shipping_address_id").references(() => address.id, { onDelete: "set null" } ),
	status: text().default("pending").notNull(),
	userId: text("user_id").references(() => user.id, { onDelete: "set null" } ),
	createdAt: integer("created_at").default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch() * 1000)`).notNull(),
},
(table) => [
	index("checkout_status_idx").on(table.status),
	index("checkout_userId_idx").on(table.userId),
	index("checkout_cartId_idx").on(table.cartId),
]);

export const courier = sqliteTable("courier", {
	id: text().primaryKey().notNull(),
	internalCode: text("internal_code").notNull(),
	isActive: integer("is_active").default(true).notNull(),
	logo: text({ length: 2048 }),
	name: text().notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch() * 1000)`).notNull(),
},
(table) => [
	uniqueIndex("courier_internal_code_unique").on(table.internalCode),
]);

export const deliveryMethod = sqliteTable("delivery_method", {
	apiServiceCode: text("api_service_code").notNull(),
	courierId: text("courier_id").notNull().references(() => courier.id, { onDelete: "cascade" } ),
	description: text(),
	id: text().primaryKey().notNull(),
	isActive: integer("is_active").default(true).notNull(),
	name: text().notNull(),
	price: integer().notNull(),
	type: text().notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch() * 1000)`).notNull(),
});

export const discount = sqliteTable("discount", {
	code: text().notNull(),
	endsAt: integer("ends_at"),
	id: text().primaryKey().notNull(),
	isActive: integer("is_active").default(true).notNull(),
	startsAt: integer("starts_at"),
	type: text().notNull(),
	usageCount: integer("usage_count").default(0).notNull(),
	usageLimit: integer("usage_limit"),
	value: integer().notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch() * 1000)`).notNull(),
},
(table) => [
	index("discount_code_idx").on(table.code),
	uniqueIndex("discount_code_unique").on(table.code),
]);

export const order = sqliteTable("order", {
	canceledAt: integer("canceled_at"),
	checkoutId: text("checkout_id").references(() => checkout.id, { onDelete: "set null" } ),
	currencyCode: text("currency_code", { length: 3 }).default("PLN").notNull(),
	customerNote: text("customer_note"),
	deliveredAt: integer("delivered_at"),
	deliveryMethodId: text("delivery_method_id").references(() => deliveryMethod.id, { onDelete: "set null" } ),
	discountId: text("discount_id"),
	discountTotal: integer("discount_total").default(0).notNull(),
	email: text({ length: 320 }).notNull(),
	fulfillmentStatus: text("fulfillment_status").default("not_fulfilled").notNull(),
	id: text().primaryKey().notNull(),
	lockerId: text("locker_id"),
	metadata: text(),
	paymentId: text("payment_id").references(() => payment.id, { onDelete: "set null" } ),
	shippedAt: integer("shipped_at"),
	shippingTotal: integer("shipping_total").default(0).notNull(),
	status: text().default("pending").notNull(),
	subtotal: integer().default(0).notNull(),
	taxTotal: integer("tax_total").default(0).notNull(),
	total: integer().default(0).notNull(),
	trackingNumber: text("tracking_number"),
	trackingUrl: text("tracking_url", { length: 2048 }),
	userId: text("user_id").references(() => user.id, { onDelete: "set null" } ),
	createdAt: integer("created_at").default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch() * 1000)`).notNull(),
},
(table) => [
	uniqueIndex("order_checkoutId_unique").on(table.checkoutId),
	index("order_userId_status_idx").on(table.userId, table.status),
	index("order_createdAt_idx").on(table.createdAt),
	index("order_status_idx").on(table.status),
	index("order_userId_idx").on(table.userId),
]);

export const orderAddress = sqliteTable("order_address", {
	address1: text({ length: 512 }).notNull(),
	address2: text({ length: 512 }),
	city: text({ length: 256 }).notNull(),
	countryCode: text("country_code", { length: 2 }).notNull(),
	firstName: text("first_name", { length: 256 }).notNull(),
	id: text().primaryKey().notNull(),
	lastName: text("last_name", { length: 256 }).notNull(),
	orderId: text("order_id").notNull().references(() => order.id, { onDelete: "cascade" } ),
	phone: text({ length: 32 }),
	postalCode: text("postal_code", { length: 32 }),
	province: text({ length: 256 }),
	type: text().notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch() * 1000)`).notNull(),
},
(table) => [
	index("order_address_type_idx").on(table.type),
	index("order_address_orderId_idx").on(table.orderId),
]);

export const orderItem = sqliteTable("order_item", {
	id: text().primaryKey().notNull(),
	metadata: text(),
	orderId: text("order_id").notNull().references(() => order.id, { onDelete: "cascade" } ),
	productId: text("product_id"),
	quantity: integer().notNull(),
	subtotal: integer().notNull(),
	thumbnail: text({ length: 2048 }),
	title: text({ length: 512 }).notNull(),
	total: integer().notNull(),
	unitPrice: integer("unit_price").notNull(),
	variantId: text("variant_id").references(() => productVariant.id, { onDelete: "set null" } ),
	variantTitle: text("variant_title", { length: 512 }),
	createdAt: integer("created_at").default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch() * 1000)`).notNull(),
},
(table) => [
	index("order_item_orderId_idx").on(table.orderId),
]);

export const payment = sqliteTable("payment", {
	amount: integer().notNull(),
	checkoutId: text("checkout_id").notNull().references(() => checkout.id, { onDelete: "cascade" } ),
	currency: text({ length: 3 }).default("PLN").notNull(),
	id: text().primaryKey().notNull(),
	provider: text().notNull(),
	refundedAmount: integer("refunded_amount").default(0).notNull(),
	refundedAt: integer("refunded_at"),
	status: text().default("pending").notNull(),
	transactionId: text("transaction_id"),
	createdAt: integer("created_at").default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch() * 1000)`).notNull(),
},
(table) => [
	uniqueIndex("payment_transactionId_unique").on(table.transactionId),
	index("payment_checkoutId_idx").on(table.checkoutId),
]);

export const session = sqliteTable("session", {
	expiresAt: integer("expires_at").notNull(),
	id: text().primaryKey().notNull(),
	impersonatedBy: text("impersonated_by"),
	ipAddress: text("ip_address", { length: 45 }),
	token: text({ length: 16384 }).notNull(),
	userAgent: text("user_agent", { length: 4096 }),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" } ),
	createdAt: integer("created_at").default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch() * 1000)`).notNull(),
},
(table) => [
	index("session_userId_idx").on(table.userId),
	uniqueIndex("session_token_unique").on(table.token),
]);

export const twoFactor = sqliteTable("two_factor", {
	backupCodes: text("backup_codes").notNull(),
	id: text().primaryKey().notNull(),
	secret: text().notNull(),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" } ),
	verified: integer().default(true),
	createdAt: integer("created_at").default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch() * 1000)`).notNull(),
	failedVerificationCount: integer("failed_verification_count").default(0).notNull(),
	lockedUntil: integer("locked_until"),
});

export const verification = sqliteTable("verification", {
	expiresAt: integer("expires_at").notNull(),
	id: text().primaryKey().notNull(),
	identifier: text({ length: 512 }).notNull(),
	value: text({ length: 8192 }).notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch() * 1000)`).notNull(),
},
(table) => [
	index("verification_identifier_idx").on(table.identifier),
]);

export const user = sqliteTable("user", {
	banExpires: integer("ban_expires"),
	banReason: text("ban_reason"),
	banned: integer().default(false),
	email: text({ length: 320 }).notNull(),
	emailVerified: integer("email_verified").default(false).notNull(),
	id: text().primaryKey().notNull(),
	image: text({ length: 2048 }),
	isAnonymous: integer("is_anonymous").default(false),
	metadata: text(),
	name: text({ length: 256 }).notNull(),
	phone: text({ length: 32 }),
	role: text().default("customer").notNull(),
	stripeCustomerId: text("stripe_customer_id"),
	timezone: text({ length: 64 }),
	twoFactorEnabled: integer("two_factor_enabled").default(false),
	createdAt: integer("created_at").default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch() * 1000)`).notNull(),
},
(table) => [
	index("user_createdAt_idx").on(table.createdAt),
	uniqueIndex("user_email_unique").on(table.email),
]);

export const inventory = sqliteTable("inventory", {
	id: text({ length: 36 }).primaryKey().notNull(),
	quantityAvailable: integer("quantity_available").default(0).notNull(),
	quantityReserved: integer("quantity_reserved").default(0).notNull(),
	variantId: text("variant_id", { length: 36 }).notNull().references(() => productVariant.id, { onDelete: "cascade" } ),
	version: integer().default(1).notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch() * 1000)`).notNull(),
},
(table) => [
	uniqueIndex("inventory_variantId_unique").on(table.variantId),
	index("inventory_variantId_idx").on(table.variantId),
]);

export const productVariant = sqliteTable("product_variant", {
	barcode: text({ length: 255 }),
	compareAtPrice: integer("compare_at_price"),
	id: text({ length: 36 }).primaryKey().notNull(),
	manageInventory: integer("manage_inventory").default(true).notNull(),
	metadata: text(),
	price: integer().default(0).notNull(),
	productId: text("product_id", { length: 36 }).notNull().references(() => product.id, { onDelete: "cascade" } ),
	sku: text({ length: 255 }),
	title: text({ length: 512 }).notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch() * 1000)`).notNull(),
},
(table) => [
	index("product_variant_sku_idx").on(table.sku),
	index("product_variant_productId_idx").on(table.productId),
	uniqueIndex("product_variant_sku_unique").on(table.sku),
]);

export const productAttribute = sqliteTable("product_attribute", {
	id: text({ length: 36 }).primaryKey().notNull(),
	handle: text({ length: 255 }).notNull(),
	titles: text().notNull(),
	type: text().notNull(),
	unit: text({ length: 64 }),
	allowedValues: text("allowed_values"),
	rank: integer().default(0).notNull(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
},
(table) => [
	index("product_attribute_rank_idx").on(table.rank),
	uniqueIndex("product_attribute_handle_unique").on(table.handle),
]);

export const categoryOnProduct = sqliteTable("category_on_product", {
	categoryId: text("category_id", { length: 36 }).notNull().references(() => productCategory.id, { onDelete: "cascade" } ),
	isPrimary: integer("is_primary").default(false).notNull(),
	productId: text("product_id", { length: 36 }).notNull().references(() => product.id, { onDelete: "cascade" } ),
},
(table) => [
	uniqueIndex("category_on_product_one_primary_per_product_uidx").on(table.productId),
	index("category_on_product_product_id_idx").on(table.productId),
	index("category_on_product_category_id_idx").on(table.categoryId),
	primaryKey({ columns: [table.categoryId, table.productId], name: "category_on_product_category_id_product_id_pk"})
]);

export const collectionOnProduct = sqliteTable("collection_on_product", {
	collectionId: text("collection_id", { length: 36 }).notNull().references(() => productCollection.id, { onDelete: "cascade" } ),
	productId: text("product_id", { length: 36 }).notNull().references(() => product.id, { onDelete: "cascade" } ),
	rank: integer().default(0).notNull(),
},
(table) => [
	index("collection_on_product_collection_rank_idx").on(table.collectionId, table.rank),
	index("collection_on_product_product_id_idx").on(table.productId),
	index("collection_on_product_collection_id_idx").on(table.collectionId),
	primaryKey({ columns: [table.collectionId, table.productId], name: "collection_on_product_collection_id_product_id_pk"})
]);

export const productCategory = sqliteTable("product_category", {
	descriptions: text(),
	handle: text({ length: 255 }).notNull(),
	id: text({ length: 36 }).primaryKey().notNull(),
	image: text({ length: 2048 }),
	metadata: text(),
	parentId: text("parent_id", { length: 36 }),
	rank: integer().default(0).notNull(),
	shortDescriptions: text("short_descriptions"),
	status: text().default("draft").notNull(),
	subtitles: text(),
	titles: text().notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch() * 1000)`).notNull(),
},
(table) => [
	index("product_category_status_parent_rank_idx").on(table.status, table.parentId, table.rank),
	index("product_category_parent_rank_idx").on(table.parentId, table.rank),
	uniqueIndex("product_category_handle_unique").on(table.handle),
	foreignKey(() => ({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "product_category_parent_id_product_category_id_fk"
		})).onDelete("set null"),
]);

export const productCollection = sqliteTable("product_collection", {
	descriptions: text(),
	handle: text({ length: 255 }).notNull(),
	id: text({ length: 36 }).primaryKey().notNull(),
	image: text({ length: 2048 }),
	metadata: text(),
	rank: integer().default(0).notNull(),
	status: text().default("draft").notNull(),
	titles: text().notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch() * 1000)`).notNull(),
},
(table) => [
	index("product_collection_status_rank_idx").on(table.status, table.rank),
	uniqueIndex("product_collection_handle_unique").on(table.handle),
]);

export const product = sqliteTable("product", {
	descriptions: text(),
	handle: text({ length: 255 }).notNull(),
	id: text({ length: 36 }).primaryKey().notNull(),
	metadata: text(),
	primaryCategoryId: text("primary_category_id", { length: 36 }),
	rank: integer().default(0).notNull(),
	status: text().default("draft").notNull(),
	subtitles: text(),
	tags: text(),
	thumbnail: text({ length: 2048 }),
	titles: text().notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch() * 1000)`).notNull(),
},
(table) => [
	index("product_status_updatedAt_idx").on(table.status, table.updatedAt),
	index("product_status_rank_idx").on(table.status, table.rank),
	index("product_status_createdAt_idx").on(table.status, table.createdAt),
	index("product_rank_idx").on(table.rank),
	index("product_primary_category_id_idx").on(table.primaryCategoryId),
	uniqueIndex("product_handle_unique").on(table.handle),
]);

export const auditLog = sqliteTable("audit_log", {
	id: text().primaryKey().notNull(),
	action: text().notNull(),
	category: text().notNull(),
	severity: text().notNull(),
	actorId: text("actor_id"),
	actorName: text("actor_name").notNull(),
	actorRole: text("actor_role").notNull(),
	target: text().notNull(),
	detail: text(),
	ip: text(),
	metadata: text(),
	createdAt: integer("created_at").notNull(),
	resourceId: text("resource_id"),
},
(table) => [
	index("audit_log_resource_idx").on(table.category, table.resourceId),
	index("audit_log_action_idx").on(table.action),
	index("audit_log_severity_idx").on(table.severity),
	index("audit_log_category_idx").on(table.category),
	index("audit_log_createdAt_idx").on(table.createdAt),
]);

export const productOption = sqliteTable("product_option", {
	id: text({ length: 36 }).primaryKey().notNull(),
	productId: text("product_id", { length: 36 }).notNull().references(() => product.id, { onDelete: "cascade" } ),
	titles: text().notNull(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
},
(table) => [
	uniqueIndex("product_option_product_title_pl_unique").on(),
	index("product_option_productId_idx").on(table.productId),
]);

export const productOptionValue = sqliteTable("product_option_value", {
	id: text({ length: 36 }).primaryKey().notNull(),
	optionId: text("option_id", { length: 36 }).notNull().references(() => productOption.id, { onDelete: "cascade" } ),
	labels: text().notNull(),
	rank: integer().default(0).notNull(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
},
(table) => [
	uniqueIndex("product_option_value_option_label_pl_unique").on(),
	index("product_option_value_optionId_idx").on(table.optionId),
]);

export const optionOnVariant = sqliteTable("option_on_variant", {
	id: text({ length: 36 }).primaryKey().notNull(),
	optionId: text("option_id", { length: 36 }).notNull().references(() => productOption.id, { onDelete: "cascade" } ),
	valueId: text("value_id", { length: 36 }).notNull().references(() => productOptionValue.id, { onDelete: "cascade" } ),
	variantId: text("variant_id", { length: 36 }).notNull().references(() => productVariant.id, { onDelete: "cascade" } ),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
},
(table) => [
	uniqueIndex("option_on_variant_variant_option_unique").on(table.variantId, table.optionId),
	index("option_on_variant_variantId_idx").on(table.variantId),
	index("option_on_variant_valueId_idx").on(table.valueId),
	index("option_on_variant_optionId_idx").on(table.optionId),
]);

export const productImage = sqliteTable("product_image", {
	alt: text({ length: 512 }),
	id: text({ length: 36 }).primaryKey().notNull(),
	productId: text("product_id", { length: 36 }).notNull().references(() => product.id, { onDelete: "cascade" } ),
	rank: integer().default(0).notNull(),
	url: text({ length: 2048 }).notNull(),
	variantId: text("variant_id", { length: 36 }).references(() => productVariant.id, { onDelete: "cascade" } ),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
},
(table) => [
	index("product_image_variantId_rank_idx").on(table.variantId, table.rank),
	index("product_image_productId_rank_idx").on(table.productId, table.rank),
]);

export const attributeOnProduct = sqliteTable("attribute_on_product", {
	attributeId: text("attribute_id", { length: 36 }).notNull().references(() => productAttribute.id, { onDelete: "restrict" } ),
	id: text({ length: 36 }).primaryKey().notNull(),
	productId: text("product_id", { length: 36 }).notNull().references(() => product.id, { onDelete: "cascade" } ),
	rank: integer().default(0).notNull(),
	value: text({ length: 4096 }).notNull(),
	variantId: text("variant_id", { length: 36 }).references(() => productVariant.id, { onDelete: "cascade" } ),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
},
(table) => [
	uniqueIndex("attribute_on_product_scope_attribute_uidx").on(),
	index("attribute_on_product_variantId_idx").on(table.variantId),
	index("attribute_on_product_productId_idx").on(table.productId),
]);

export const rateLimit = sqliteTable("rate_limit", {
	count: integer().notNull(),
	id: text().primaryKey().notNull(),
	key: text().notNull(),
	lastRequest: integer("last_request").notNull(),
},
(table) => [
	index("rate_limit_last_request_idx").on(table.lastRequest),
	uniqueIndex("rate_limit_key_unique").on(table.key),
]);

