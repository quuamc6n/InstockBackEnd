const express = require("express");
const knex = require("knex")(require("./knexfile"));

const app = express();
require("dotenv").config();

app.use(express.json());

const { PORT } = process.env;

const cors = require("cors");

app.use(express.json());
app.use(express.static("public"));
app.use(cors());

app.get("/", (req, res) => {
  res.send("HELLO WORLD");
});

app.get("/warehouses", (_req, res) => {
  knex("warehouses")
    .then((warehouses) => {
      res.status(200).json(warehouses);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: "Unable to retrieve warehouses" });
    });
});

app.get("/warehouses/:id", (req, res) => {
  const warehouseId = req.params.id;

  knex("warehouses")
    .where({ id: warehouseId })
    .first()
    .then((warehouse) => {
      if (warehouse) {
        res.status(200).json(warehouse);
      } else {
        res.status(404).json({ message: "Warehouse not found" });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(404).json({ message: "Unable to retrieve warehouse" });
    });
});

//DELETE WAREHOUSE ENDPOINT
app.delete("/warehouses/:id", (req, res) => {
  const warehouseId = req.params.id;

  knex.transaction((trx) => {
    // Check if there are any associated inventory items
    trx("inventories")
      .where("warehouse_id", warehouseId)
      .select("id")
      .first()
      .then((inventoryItem) => {
        if (inventoryItem) {
          // Delete inventory items associated with the warehouse
          return trx("inventories")
            .where("warehouse_id", warehouseId)
            .del();
        }
      })
      .then(() => {
        // Delete the warehouse itself
        return trx("warehouses")
          .where("id", warehouseId)
          .del();
      })
      .then((deletedRows) => {
        if (deletedRows === 0) {
          // Warehouse not found, return 404
          res.status(404).json({ message: "Warehouse not found" });
        } else {
          trx.commit();
          res.status(204).end();
        }
      })
      .catch((err) => {
        trx.rollback();
        console.log(err);
        res.status(500).json({ message: "Error deleting warehouse" });
      });
  });
});

// DELETE Inventory Item
app.delete("/inventories/:id", (req, res) => {
  const inventoryId = req.params.id;

  knex.from("inventories")
  .where("id", inventoryId)
  .del()
  .then((deleted) => {
    res.status(200).json({ message: "Successfully deleted item" });
    console.log(deleted)
  })
  .catch((err) => {
    res.status(400).json({ message: "Error deleting inventory item" });
    console.log(err)
  })
})

//get inventory list
app.get("/inventories", (_req, res) => {
  knex
    .from("inventories")
    .innerJoin("warehouses", "inventories.warehouse_id", "warehouses.id")
    .select(
      "inventories.id",
      "warehouse_name",
      "item_name",
      "description",
      "category",
      "status",
      "quantity"
    )
    .then((data) => {
      res.status(200).json(data);
    })
    .catch((err) => {
      console.log(err);
      res.status(404).json({ message: "Unable to retrieve inventories" });
    });
});

//Updates warehouse information
app.put("/warehouses/:id", (req, res) => {
  const id = req.params.id;

  knex("warehouses")
    .where({id: id })
    .first()
    .then((data) => {
      if (!data) {
        res.status(404).json({ message: `Warehouse ID not found` });
      }
      return knex("warehouses").where({ id: data.id }).update({
        warehouse_name: req.body.warehouse_name,
        address: req.body.address,
        city: req.body.city,
        country: req.body.country,
        contact_name: req.body.contact_name,
        contact_position: req.body.contact_position,
        contact_phone: req.body.contact_phone,
        contact_email: req.body.contact_email
      });
    })
    .then(() => {
      res.sendStatus(200);
    })
    .catch((err) => {
      console.log(err);
      res.status(404).json({ message: `Warehouse ID not found` });
    });
});

//GETs a single inventory item's details along with wawrehouse name
app.get("/inventories/:id", (req, res) => {
  const itemId = req.params.id;

  knex
    .from("inventories")
    .where({ "inventories.id": itemId })
    .innerJoin("warehouses", "inventories.warehouse_id", "warehouses.id")
    .select(
      "warehouse_name",
      "item_name",
      "description",
      "category",
      "status",
      "quantity",
      "inventories.id"
    )
    .then((data) => {
      if (data[0].id) {
        res.status(200).json(data);
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(404).json({ message: "Item not found" });
    });
});

//EDIT INVENTORY ITEM
app.put("/inventories/:id", (req, res) => {
  const id = req.params.id;
  const warehouseName = req.body.warehouse_name;

  knex.transaction((trx) => {
    // Check if the warehouse with the given name exists
    trx("warehouses")
      .where("warehouse_name", warehouseName)
      .first()
      .then((warehouse) => {
        if (!warehouse) {
          // Warehouse not found, return 404
          res.status(404).json({ message: "Warehouse not found" });
        } else {
          // Warehouse found, update the inventory record with the warehouse_id
          return trx("inventories").where({ id: id }).update({
            warehouse_id: warehouse.id,
            item_name: req.body.item_name,
            description: req.body.description,
            category: req.body.category,
            status: req.body.status,
            quantity: req.body.quantity,
          });
        }
      })
      .then(() => {
        trx.commit();
        res.sendStatus(200);
      })
      .catch((err) => {
        trx.rollback();
        console.log(err);
        res.status(500).json({ message: "Error updating inventory" });
      });
  });
});

//ADD NEW INVENTORY ITEM
app.post("/inventories", (req, res) => {
  //item_name, description, category, warehouse_name
  if (!req.body.warehouse_id) {
    //Checks if user picked a warehouse
    res.status(400).json({ message: `Please choose a warehouse` });
  } else if (isNaN(req.body.quantity) || req.body.quantity < 0) {
    //Checks if user typed in a quantity of 0 or greater
    res
      .status(400)
      .json({ message: `Please ensure the quantity is 0 or higher` });
  } else if (
    !req.body.item_name ||
    !req.body.description ||
    !req.body.category
  ) {
    //Checks if any other form details have been missed
    res.status(400).json({ message: `Please fill out all form details` });
  } else {
    //Once all validation is complete, if no errors, we send data to server or catch error
    knex("inventories")
      .insert(req.body)
      .then((data) => {
        res.status(200).json(data[0]);
      })
      .catch((err) => {
        console.log(err);
        res.status(404).json({ message: `Error creating item` });
      });
  }
});

// GET inventories for given warehouse
app.get("/warehouses/:id/inventories", (req, res) => {
  const warehouseId = req.params.id;

  knex
    .from("inventories")
    .where({ "inventories.warehouse_id": warehouseId })
    .innerJoin("warehouses", "inventories.warehouse_id", "warehouses.id")
    .select("warehouse_id", "item_name", "category", "status", "quantity", "inventories.id")
    .then((data) => {
      if (data[0].warehouse_id) {
        res.status(200).json(data);
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(404).json({ message: "Warehouse ID not found" });
    });
});

// POST new warehouse
app.post("/warehouses", (req, res) => {

 if (
    !req.body.warehouse_name ||
    !req.body.address ||
    !req.body.city ||
    !req.body.country ||
    !req.body.contact_name ||
    !req.body.contact_position 
  )  {
    //Checks if any other form details have been missed
    res.status(400).json({ message: "Please fill out all form details" });
  }
  // else if (req.body.contact_phone)
  else {
    //Once all validation is complete, if no errors, we send data to server or catch error
    knex("warehouses")
      .insert(req.body)
      .then((data) => {
        res.status(200).json(data[0]);
      })
      .catch((err) => {
        console.log(err);
        res.status(404).json({ message: "Error creating warehouse" });
      });
  }})

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
