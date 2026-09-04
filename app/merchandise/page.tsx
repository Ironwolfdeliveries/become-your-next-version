import { Shop } from "@/components/shop"; import { PageHero } from "@/components/ui";
export const metadata={title:"Merchandise",description:"Preview BYNV and Architects apparel, notebooks, bottles and accessories."};
export default function Merchandise(){return <><PageHero eyebrow="The Architects supply" title="Carry the practice into everyday life." copy="Preview planned apparel and everyday items for The Architects. The collection is not available to buy until inventory, shipping, and checkout are ready."/><section className="container"><Shop /></section></>}
