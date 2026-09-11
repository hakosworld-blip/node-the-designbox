import { motion } from "framer-motion";
import { Boxes, Compass, Home } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 text-foreground"
    >
      {/* Ambient color */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/3 h-72 w-72 rounded-full bg-violet-600/20 blur-[110px]" />
        <div className="absolute right-1/4 bottom-1/4 h-72 w-72 rounded-full bg-cyan-500/15 blur-[110px]" />
      </div>

      <div className="relative text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-lg shadow-violet-500/25">
          <Boxes className="size-6 text-white" />
        </span>
        <p className="mt-8 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-7xl font-bold text-transparent">
          404
        </p>
        <h1 className="mt-3 text-xl font-semibold">
          This canvas is still blank
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          The page you're looking for doesn't exist — it may have been moved,
          trashed, or never drawn in the first place.
        </p>
        <div className="mt-8 flex items-center justify-center gap-2">
          <Button
            className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
            onClick={() => navigate("/")}
          >
            <Home className="size-4" />
            Back to home
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate("/explore")}
          >
            <Compass className="size-4" />
            Explore designs
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
