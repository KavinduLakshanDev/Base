<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Barcodes - {{ $purchase->PurchaseNo }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #fff;
        }
        .label-container {
            width: 100%;
            display: block;
        }
        .label-item {
            width: 30%;
            display: inline-block;
            margin: 1%;
            padding: 10px;
            border: 1px dashed #ccc;
            text-align: center;
            box-sizing: border-box;
            page-break-inside: avoid;
        }
        .item-name {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 5px;
            max-height: 28px;
            overflow: hidden;
        }
        .barcode-image {
            width: 100%;
            max-height: 40px;
            object-fit: contain;
            margin-bottom: 5px;
        }
        .barcode-string {
            font-size: 10px;
            letter-spacing: 1px;
            margin-bottom: 2px;
        }
        .price {
            font-size: 11px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="label-container">
        @foreach($barcodeItems as $item)
            <div class="label-item">
                <div class="item-name">{{ \Illuminate\Support\Str::limit($item['name'], 30) }}</div>
                <img src="data:image/png;base64,{{ $item['image'] }}" class="barcode-image" alt="Barcode">
                <div class="barcode-string">{{ $item['barcode_string'] }}</div>
                @if(isset($item['price']) && $item['price'] > 0)
                    <div class="price">Cost: {{ number_format($item['price'], 2) }}</div>
                @endif
            </div>
        @endforeach
    </div>
</body>
</html>
