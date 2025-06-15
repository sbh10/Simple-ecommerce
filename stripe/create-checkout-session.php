<?php
require __DIR__ . '/stripe-php/init.php';

$config = require __DIR__ . '/../config.php';

\Stripe\Stripe::setApiKey($config['stripe_secret_key']);

header('Content-Type: application/json');

$cart = json_decode(file_get_contents('php://input'), true);

if (!$cart || count($cart) === 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Panier vide']);
    exit;
}

$line_items = [];

foreach ($cart as $item) {
    $line_items[] = [
        'price_data' => [
            'currency' => 'eur',
            'product_data' => [
                'name' => $item['productName'] . " (Taille " . $item['size'] . ")",
            ],
            'unit_amount' => intval($item['price'] * 100),
        ],
        'quantity' => $item['quantity'],
    ];
}

$YOUR_DOMAIN = 'http://localhost/Project_5_Easy_e-commerce/stripe'; 

$checkout_session = \Stripe\Checkout\Session::create([
    'payment_method_types' => ['card'],
    'line_items' => $line_items,
    'mode' => 'payment',
    'success_url' => $YOUR_DOMAIN . '/success.html',
    'cancel_url' => $YOUR_DOMAIN . '/cancel.html',
]);

echo json_encode(['id' => $checkout_session->id]);
