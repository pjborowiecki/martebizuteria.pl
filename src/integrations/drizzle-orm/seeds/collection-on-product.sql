-- Depends on products.sql and product-collections.sql.

DELETE FROM collection_on_product
WHERE product_id IN (
  '019e99d8-9f56-777d-8f3c-95c393be568b',
  '019e99f2-dfa2-7798-b04f-cebfdbbdb427'
);

INSERT OR REPLACE INTO collection_on_product (product_id, collection_id, rank) VALUES
('019e99d8-9f56-777d-8f3c-95c393be568b', '019e97ab-79e8-7449-b193-28b63bd5be04', 0),
('019e99d8-9f56-777d-8f3c-95c393be568b', '019e97ab-79ea-77ac-8f36-b86ef9405511', 1),
('019e99f2-dfa2-7798-b04f-cebfdbbdb427', '019e97ab-79ea-77ac-8f36-b86ef9405511', 0),
('019e99f2-dfa2-7798-b04f-cebfdbbdb427', '019e97ab-79e8-7449-b193-28b63bd5be04', 1);
