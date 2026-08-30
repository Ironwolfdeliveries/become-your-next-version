import { Shop } from "@/components/shop"; import { PageHero } from "@/components/ui";
export const metadata={title:"Merchandise",description:"Preview BYNV and Architects apparel, notebooks, bottles and accessories."};
export default function Merchandise(){return <><PageHero eyebrow="The Architects supply" title="Tools for the work in progress." copy="A concept collection of considered apparel and everyday objects. Inventory, fulfillment, and checkout are not connected, so no purchase is taken here."/><section className="container"><Shop /></section></>}
