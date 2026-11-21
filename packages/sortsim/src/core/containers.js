// Copied from github.com/Mike17K/recycleiq-delta-sort (src/core/containers.js); see NOTICE.
/** Big collection containers that mobile robots empty bins into. A full container is optionally swapped by a "truck". */
export class Container {
  constructor(cfg) {
    Object.assign(this, { id: cfg.id, x: cfg.x, y: cfg.y, capacity: cfg.capacity, materials: cfg.materials ?? null, tTruck: cfg.tTruck ?? null });
    this.fill = 0; this.incoming = 0; this.emptied = 0; this.truckAt = null;
    this.minRoom = 1;                       // set by the fleet: room needed for the largest bin
  }
  accepts(material) { return !this.materials || this.materials.includes(material); }
  /** Room for n more items counting what is already on its way. */
  hasRoom(n) { return this.fill + this.incoming + n <= this.capacity && this.truckAt == null; }
  get ratio() { return Math.min(1, this.fill / this.capacity); }
  /** Full = cannot take another (largest) bin. */
  get isFull() { return this.capacity - this.fill < this.minRoom; }
  update(t) {
    if (this.tTruck == null) return;
    if (this.isFull && this.truckAt == null && this.incoming === 0) this.truckAt = t + this.tTruck;
    if (this.truckAt != null && t + 1e-9 >= this.truckAt) { this.fill = 0; this.emptied++; this.truckAt = null; }
  }
}
