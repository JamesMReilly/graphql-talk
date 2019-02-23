const express = require("express");
const { ApolloServer, gql, ApolloError } = require("apollo-server-express");
const {
  customerRepository,
  orderRepository,
  productRepository
} = require("./repositories");
const db = require("./db");
const { DateTime } = require("./scalars");

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
  scalar DateTime

  type Customer {
    id: Int
    firstName: String
    lastName: String
    email: String
    phone: String
    address: Address
    orders: [Order]
  }

  type Address {
    streetAddress: String
    city: String
    state: String
    zipCode: String
  }

  type Order {
    id: Int
    customer: Customer
    paymentType: String
    ordered: DateTime
    shipped: DateTime
    lineItems: [LineItem]
  }

  type LineItem {
    product: Product
    quantity: Int
  }

  type Product {
    name: String
    company: String
    retailPrice: Float
    sku: String
  }

  type Query {
    customers: [Customer]
    customerOrders(customerId: Int!): [Order]
  }
`;

class AddressNotFound extends ApolloError {
  constructor(message) {
    super(message);
  }
}

// Provide resolver functions for your schema fields
const resolvers = {
  DateTime,
  Query: {
    customers: (parent, args, context, info) => {
      return context.customerRepository.findAll();
    },
    customerOrders: (parent, args, context, info) => {
      return context.orderRepository.findOrdersByCustomerId.load(
        args.customerId
      );
    }
  },
  // Example List Resolver.
  Customer: {
    address: (customer, args, context, info) => {
      if (!customer.address) {
        // this allows an error object to show along with data.
        throw new AddressNotFound(`No address for customer: ${customer.id}`);
      }
      return customer.address;
    },
    orders: (customer, args, context, info) => {
      return context.orderRepository.findOrdersByCustomerId.load(customer.id);
    }
  },
  Order: {
    lineItems: (order, args, context, info) => {
      return context.orderRepository.findLineItemsByOrderId.load(order.id);
    },
    customer: (order, args, context) => {
      return context.customerRepository.findById.load(order.customerId);
    }
  },
  LineItem: {
    product: (lineItem, args, context, info) => {
      return context.productRepository.findById.load(lineItem.productId);
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: {
    customerRepository,
    orderRepository,
    productRepository
  }
});

const app = express();
server.applyMiddleware({ app });

const port = 4000;

app.listen({ port }, () => {
  console.log(
    `🚀 Server ready at http://localhost:${port}${server.graphqlPath}`
  );
});

process.on("exit", () => {
  console.log("start exit");
  db.close();
  console.log("end exit");
});

process.on("SIGINT", () => {
  console.log("caught interrupted");
  process.exit(0);
});
