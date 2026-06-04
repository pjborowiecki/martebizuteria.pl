-- Depends on products.sql and product-categories.sql.

DELETE FROM category_on_product
WHERE product_id IN (
  '019e99d8-9f56-777d-8f3c-95c393be568b',
  '019e99f2-dfa2-7798-b04f-cebfdbbdb427'
);

INSERT OR REPLACE INTO category_on_product (product_id, category_id, is_primary) VALUES
('019e99d8-9f56-777d-8f3c-95c393be568b', '019e91fb-0641-71e1-90a9-fb70c79176af', 1),
('019e99f2-dfa2-7798-b04f-cebfdbbdb427', '019e91fb-0641-71e1-90a9-fb70c79176af', 1);
