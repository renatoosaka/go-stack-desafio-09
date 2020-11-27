import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    // console.log(customer);

    if (!customer) {
      throw new AppError(`Customer with id: ${customer_id} not found.`);
    }

    const items = await this.productsRepository.findAllById(
      products.map(p => ({ id: p.id })),
    );

    if (items.length !== products.length) {
      throw new AppError('Some products not found.');
    }

    const orderProducts = items.map(item => {
      const product = products.find(p => p.id === item.id);

      if (product) {
        if (item.quantity - product.quantity < 0) {
          throw new AppError(`Invalid quantity for product ${item.name}`);
        }
      }

      return {
        product_id: item.id,
        price: item.price,
        quantity: product?.quantity || 1,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: orderProducts,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;
